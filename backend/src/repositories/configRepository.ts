import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

export class ConfigRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  list() {
    return this.db.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  get(key: string) {
    return this.db.systemConfig.findUnique({ where: { key } });
  }

  upsert(key: string, value: Prisma.InputJsonValue) {
    return this.db.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
