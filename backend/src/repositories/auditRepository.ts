import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

export interface AuditFilters {
  userId?: string;
  action?: string;
  entity?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export class AuditRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  async list(filters: AuditFilters) {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
      ...(filters.entity ? { entity: { contains: filters.entity, mode: 'insensitive' } } : {}),
      ...(filters.from || filters.to ? { timestamp: { gte: filters.from, lte: filters.to } } : {}),
    };
    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.db.auditLog.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }
}
