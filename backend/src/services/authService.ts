import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { hash, compare } from 'bcrypt';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import { prisma } from '@/config/db';
import { env } from '@/config/env';
import { jwtConfig } from '@/config/jwt';
import { sendEmail } from '@/config/mail';
import { AppError } from '@/utils/appError';
import { UserRepository } from '@/repositories/userRepository';

const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const APP_NAME = 'AgroSense';

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function expirySeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match)
    throw new Error('La expiración JWT debe expresarse en segundos, minutos, horas o días.');
  const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return (Number(match[1]) * units[match[2]]) / 1000;
}

function expiryDate(duration: string): Date {
  return new Date(Date.now() + expirySeconds(duration) * 1000);
}

function publicUser(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  twoFactorEnabled?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
  };
}

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  async login(input: { email: string; password: string; twoFactorCode?: string }) {
    const user = await this.users.findByEmail(input.email);
    if (!user?.active || !(await compare(input.password, user.passwordHash))) {
      throw new AppError('Correo o contraseña incorrectos.', 401);
    }

    if (user.twoFactorEnabled) {
      if (!input.twoFactorCode || !user.twoFactorSecret) {
        throw new AppError('Ingresa el código de autenticación de dos factores.', 401);
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: input.twoFactorCode,
        window: 1,
      });
      if (!verified) throw new AppError('El código de autenticación no es válido.', 401);
    }

    return this.issueSession(user);
  }

  async refresh(refreshToken: string) {
    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    } catch {
      throw new AppError('La sesión venció. Inicia sesión nuevamente.', 401);
    }

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      payload.type !== REFRESH_TOKEN_TYPE
    ) {
      throw new AppError('Token de renovación inválido.', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: digest(refreshToken) },
      include: { user: true },
    });
    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date() ||
      !storedToken.user.active ||
      storedToken.userId !== payload.sub
    ) {
      throw new AppError('La sesión venció. Inicia sesión nuevamente.', 401);
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(storedToken.user);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: digest(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user?.active) return;
    if (!env.SMTP_HOST) {
      throw new AppError(
        'La recuperación por correo está temporalmente deshabilitada porque SMTP no está configurado.',
        503,
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: digest(token), expiresAt },
      }),
    ]);

    const resetUrl = new URL('/reset-password', env.FRONTEND_URL);
    resetUrl.searchParams.set('token', token);
    const safeName = user.name.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });

    await sendEmail({
      to: user.email,
      subject: 'Restablece tu contraseña de AgroSense',
      text: `Hola ${user.name}, usa este enlace para restablecer tu contraseña: ${resetUrl.toString()}`,
      html: `<p>Hola ${safeName},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl.toString()}">Restablecer contraseña</a></p><p>El enlace vence en una hora. Si no solicitaste este cambio, ignora este mensaje.</p>`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: digest(token) },
    });
    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= new Date()) {
      throw new AppError('El enlace de recuperación no es válido o ya venció.', 400);
    }

    const passwordHash = await hash(newPassword, 12);
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user?.active) throw new AppError('El usuario no existe o está inactivo.', 404);
    return publicUser(user);
  }

  async updateProfile(userId: string, input: { name: string; email: string }) {
    try {
      const user = await this.users.update(userId, {
        name: input.name,
        email: input.email.toLowerCase(),
      });
      return publicUser(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AppError('Ese correo ya está registrado.', 409);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user?.active || !(await compare(input.currentPassword, user.passwordHash))) {
      throw new AppError('La contraseña actual es incorrecta.', 400);
    }
    const passwordHash = await hash(input.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async setupTwoFactor(userId: string) {
    const user = await this.users.findById(userId);
    if (!user?.active) throw new AppError('El usuario no existe o está inactivo.', 404);
    if (user.twoFactorEnabled)
      throw new AppError('La autenticación de dos factores ya está activa.', 409);

    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${user.email})`,
      issuer: APP_NAME,
    });
    if (!secret.otpauth_url)
      throw new Error('No se pudo generar el URI de configuración de dos factores.');
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    await this.users.update(userId, { twoFactorSecret: secret.base32 });

    return {
      secret: secret.base32,
      qrCodeDataUrl,
    };
  }

  async verifyTwoFactor(userId: string, token: string) {
    const user = await this.users.findById(userId);
    if (!user?.twoFactorSecret || user.twoFactorEnabled) {
      throw new AppError('Primero debes iniciar la configuración de dos factores.', 400);
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!verified) throw new AppError('El código de autenticación no es válido.', 400);
    await this.users.update(userId, { twoFactorEnabled: true });
    return { twoFactorEnabled: true };
  }

  async disableTwoFactor(
    userId: string,
    input: { password: string; token: string },
  ): Promise<{ twoFactorEnabled: false }> {
    const user = await this.users.findById(userId);
    if (
      !user?.twoFactorEnabled ||
      !user.twoFactorSecret ||
      !(await compare(input.password, user.passwordHash))
    ) {
      throw new AppError('No se pudo verificar la contraseña o el estado de dos factores.', 400);
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: input.token,
      window: 1,
    });
    if (!verified) throw new AppError('El código de autenticación no es válido.', 400);
    await this.users.update(userId, { twoFactorEnabled: false, twoFactorSecret: null });
    return { twoFactorEnabled: false };
  }

  private async issueSession(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    twoFactorEnabled: boolean;
  }) {
    const sessionId = randomUUID();
    const accessToken = jwt.sign(
      { type: ACCESS_TOKEN_TYPE, role: user.role },
      jwtConfig.accessSecret,
      {
        subject: user.id,
        expiresIn: expirySeconds(jwtConfig.accessExpiresIn),
        jwtid: randomUUID(),
      },
    );
    const refreshToken = jwt.sign({ type: REFRESH_TOKEN_TYPE }, jwtConfig.refreshSecret, {
      subject: user.id,
      expiresIn: expirySeconds(jwtConfig.refreshExpiresIn),
      jwtid: sessionId,
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: digest(refreshToken),
        expiresAt: expiryDate(jwtConfig.refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken, user: publicUser(user) };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
