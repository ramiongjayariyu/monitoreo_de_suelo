import { Prisma, PrismaClient, UserRole } from '@prisma/client';
import { prisma } from '@/config/db';

export type UserCreateInput = {
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
};

export class UserRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  create(data: UserCreateInput) {
    return this.db.user.create({ data: { ...data, email: data.email.toLowerCase() } });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({ where: { id }, data });
  }

  deactivate(id: string) {
    return this.db.user.update({ where: { id }, data: { active: false } });
  }

  list() {
    return this.db.user.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });
  }
}
