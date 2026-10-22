import request from 'supertest';
import speakeasy from 'speakeasy';
import { UserRole } from '@prisma/client';
import { sendEmail } from '@/config/mail';
import { app } from '@/app';
import { prisma } from '@/config/db';
import { env } from '@/config/env';

jest.mock('@/config/mail', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

describe('autenticación y usuarios', () => {
  let accessToken: string;
  let refreshToken: string;
  let adminId: string;
  let demoUserId: string;

  beforeAll(async () => {
    if (!env.DEMO_SEED_PASSWORD) throw new Error('DEM0_SEED_PASSWORD no está configurada.');
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@agrosense.local' },
    });
    adminId = admin.id;
    const demoUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'consulta@agrosense.local' },
    });
    demoUserId = demoUser.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [adminId, demoUserId] } } });
    await prisma.user.update({
      where: { id: adminId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await prisma.$disconnect();
  });

  it('rechaza credenciales incorrectas', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@agrosense.local', password: 'esta-no-es-la-clave-correcta' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Correo o contraseña incorrectos.');
  });

  it('inicia sesión, entrega perfil público y rota el refresh token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@agrosense.local', password: env.DEMO_SEED_PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({
      id: adminId,
      role: UserRole.ADMIN,
      email: 'admin@agrosense.local',
    });
    expect(login.body.user.passwordHash).toBeUndefined();
    accessToken = login.body.accessToken;
    refreshToken = login.body.refreshToken;

    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(profile.status).toBe(200);
    expect(profile.body.user.id).toBe(adminId);

    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
    refreshToken = refreshed.body.refreshToken;
    accessToken = refreshed.body.accessToken;
  });

  it('aplica autenticación y autorización por roles en administración de usuarios', async () => {
    const unauthenticated = await request(app).get('/api/users');
    expect(unauthenticated.status).toBe(401);

    const consultaLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'consulta@agrosense.local', password: env.DEMO_SEED_PASSWORD });
    const operadorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operador@agrosense.local', password: env.DEMO_SEED_PASSWORD });
    expect(operadorLogin.status).toBe(200);
    expect(operadorLogin.body.user.role).toBe(UserRole.OPERADOR);
    const operatorLogout = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: operadorLogin.body.refreshToken });
    expect(operatorLogout.status).toBe(204);
    const forbidden = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${consultaLogin.body.accessToken}`);
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Operador de prueba',
        email: `operador-${Date.now()}@agrosense.local`,
        role: UserRole.OPERADOR,
        password: 'una-clave-de-prueba-segura',
      });
    expect(created.status).toBe(201);
    const userId = created.body.user.id as string;
    try {
      const listed = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(listed.body.users.some((user: { id: string }) => user.id === userId)).toBe(true);

      const updated = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Operador actualizado' });
      expect(updated.body.user.name).toBe('Operador actualizado');

      const deactivated = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(deactivated.status).toBe(204);
    } finally {
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it('protege el último administrador y rechaza recuperación sin SMTP', async () => {
    const demoteLastAdmin = await request(app)
      .put(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: UserRole.CONSULTA });
    expect(demoteLastAdmin.status).toBe(400);

    const unknownEmail = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'no-existe@agrosense.local' });
    expect(unknownEmail.status).toBe(200);

    const knownEmail = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@agrosense.local' });
    expect(knownEmail.status).toBe(503);
  });

  it('restablece y cambia contraseñas, revocando sesiones anteriores', async () => {
    const originalSmtpHost = env.SMTP_HOST;
    const initialPassword = 'InitialTestPassword2026!';
    const resetPassword = 'ResetTestPassword2026!';
    const changedPassword = 'ChangedTestPassword2026!';
    let userId: string | undefined;
    try {
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@agrosense.local', password: env.DEMO_SEED_PASSWORD });
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
        .send({
          name: 'Cuenta de prueba <script>',
          email: `reset-${Date.now()}@agrosense.local`,
          role: UserRole.CONSULTA,
          password: initialPassword,
        });
      expect(created.status).toBe(201);
      userId = created.body.user.id;

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'x'.repeat(64), newPassword: resetPassword })
        .expect(400);

      env.SMTP_HOST = 'smtp.test.local';
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: created.body.user.email })
        .expect(200);
      const message = jest.mocked(sendEmail).mock.calls.at(-1)?.[0];
      const resetToken = String(message?.html).match(/token=([0-9a-f]{64})/)?.[1];
      if (!resetToken) throw new Error('No se generó el token de recuperación de prueba.');

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: resetPassword })
        .expect(200);
      await request(app)
        .post('/api/auth/login')
        .send({ email: created.body.user.email, password: initialPassword })
        .expect(401);

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: created.body.user.email, password: resetPassword });
      expect(login.status).toBe(200);
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ currentPassword: 'incorrecta', newPassword: changedPassword })
        .expect(400);
      await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ currentPassword: resetPassword, newPassword: changedPassword })
        .expect(200);
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);
      await request(app)
        .post('/api/auth/login')
        .send({ email: created.body.user.email, password: changedPassword })
        .expect(200);
    } finally {
      env.SMTP_HOST = originalSmtpHost;
      if (userId) {
        await prisma.passwordResetToken.deleteMany({ where: { userId } });
        await prisma.refreshToken.deleteMany({ where: { userId } });
        await prisma.auditLog.deleteMany({ where: { entityId: userId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    }
  }, 10000);

  it('permite configurar, verificar y desactivar 2FA', async () => {
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(setup.status).toBe(200);
    expect(setup.body.secret).toBeTruthy();
    expect(setup.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const token = speakeasy.totp({
      secret: setup.body.secret,
      encoding: 'base32',
    });
    const verified = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token });
    expect(verified.body.twoFactorEnabled).toBe(true);

    const requiresCode = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@agrosense.local', password: env.DEMO_SEED_PASSWORD });
    expect(requiresCode.status).toBe(401);

    const twoFactorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@agrosense.local',
        password: env.DEMO_SEED_PASSWORD,
        twoFactorCode: speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' }),
      });
    expect(twoFactorLogin.status).toBe(200);
    accessToken = twoFactorLogin.body.accessToken;
    refreshToken = twoFactorLogin.body.refreshToken;

    const disabled = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        password: env.DEMO_SEED_PASSWORD,
        token: speakeasy.totp({ secret: setup.body.secret, encoding: 'base32' }),
      });
    expect(disabled.body.twoFactorEnabled).toBe(false);
  });

  it('cierra la sesión y revoca el refresh token', async () => {
    const logout = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(logout.status).toBe(204);
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);
  });
});
