import { AlertSeverity, AlertStatus, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

export interface AlertFilters {
  nodeId?: string;
  severity?: AlertSeverity;
  variable?: string;
  status?: AlertStatus;
  from?: Date;
  to?: Date;
  take?: number;
}

export class AlertRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  create(data: Prisma.AlertUncheckedCreateInput) {
    return this.db.alert.create({
      data,
      include: { node: { select: { id: true, name: true, deviceId: true } } },
    });
  }

  list(filters: AlertFilters = {}) {
    return this.db.alert.findMany({
      where: {
        nodeId: filters.nodeId,
        severity: filters.severity,
        variable: filters.variable,
        status: filters.status,
        createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      },
      include: { node: { select: { id: true, name: true, deviceId: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters.take ?? 100,
    });
  }

  findOpenByNodeVariable(nodeId: string, variable: string) {
    return this.db.alert.findFirst({
      where: { nodeId, variable, status: { not: AlertStatus.CERRADA } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: AlertStatus) {
    const current = await this.db.alert.findUnique({ where: { id } });
    if (!current) return null;
    if (current.status === AlertStatus.CERRADA) return current;
    return this.db.alert.update({
      where: { id },
      data: {
        status,
        ...(status === AlertStatus.LEIDA ? { readAt: current.readAt ?? new Date() } : {}),
        ...(status === AlertStatus.CERRADA ? { closedAt: new Date() } : {}),
      },
      include: { node: { select: { id: true, name: true, deviceId: true } } },
    });
  }

  countActive() {
    return this.db.alert.count({ where: { status: AlertStatus.ACTIVA } });
  }
}
