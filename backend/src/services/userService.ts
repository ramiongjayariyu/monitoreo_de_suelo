import { Prisma, UserRole } from '@prisma/client';
import { hash } from 'bcrypt';
import { prisma } from '@/config/db';
import { UserRepository } from '@/repositories/userRepository';
import { AppError } from '@/utils/appError';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  twoFactorEnabled: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export class UserService {
  constructor(private readonly users = new UserRepository()) {}

  list() {
    return this.users.list();
  }

  async create(input: { name: string; email: string; role: UserRole; password: string }) {
    try {
      const user = await this.users.create({
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: await hash(input.password, 12),
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AppError('Ese correo ya está registrado.', 409);
      throw error;
    }
  }

  async update(
    id: string,
    input: { name?: string; email?: string; role?: UserRole; active?: boolean; password?: string },
    actorId: string,
  ) {
    const existingUser = await this.users.findById(id);
    if (!existingUser) throw new AppError('El usuario no existe.', 404);
    if (
      id === actorId &&
      (input.active === false || (input.role && input.role !== UserRole.ADMIN))
    ) {
      throw new AppError('No puedes desactivar ni quitarte el rol de administrador.', 400);
    }

    const removesActiveAdmin =
      existingUser.active &&
      existingUser.role === UserRole.ADMIN &&
      (input.active === false || (input.role !== undefined && input.role !== UserRole.ADMIN));

    try {
      const updated = await prisma.$transaction(async (transaction) => {
        if (removesActiveAdmin) {
          const activeAdmins = await transaction.user.count({
            where: { active: true, role: UserRole.ADMIN },
          });
          if (activeAdmins <= 1)
            throw new AppError('Debe existir al menos un administrador activo.', 400);
        }
        const updatedUser = await transaction.user.update({
          where: { id },
          data: {
            name: input.name,
            email: input.email?.toLowerCase(),
            role: input.role,
            active: input.active,
            passwordHash: input.password ? await hash(input.password, 12) : undefined,
          },
          select: publicUserSelect,
        });
        if (input.active === false || input.password) {
          await transaction.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
        return updatedUser;
      });
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AppError('Ese correo ya está registrado.', 409);
      throw error;
    }
  }

  async deactivate(id: string, actorId: string) {
    if (id === actorId) throw new AppError('No puedes desactivar tu propio usuario.', 400);
    const user = await this.users.findById(id);
    if (!user) throw new AppError('El usuario no existe.', 404);

    await prisma.$transaction(async (transaction) => {
      if (user.active && user.role === UserRole.ADMIN) {
        const activeAdmins = await transaction.user.count({
          where: { active: true, role: UserRole.ADMIN },
        });
        if (activeAdmins <= 1)
          throw new AppError('Debe existir al menos un administrador activo.', 400);
      }
      await transaction.user.update({ where: { id }, data: { active: false } });
      await transaction.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
