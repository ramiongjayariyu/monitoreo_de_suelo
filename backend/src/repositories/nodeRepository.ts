import { NodeStatus, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

const nodeDetails = {
  crop: { select: { id: true, name: true } },
  state: { select: { id: true, name: true, isActive: true } },
  readings: {
    orderBy: { timestamp: 'desc' },
    take: 1,
  },
  _count: { select: { readings: true, alerts: true } },
} satisfies Prisma.NodeInclude;

export interface NodeFilters {
  search?: string;
  cropId?: string;
  status?: NodeStatus;
}

export interface MapNodeFilters {
  cropId?: string;
  stateId?: string;
  connection?: NodeStatus;
}

export class NodeRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  list(filters: NodeFilters = {}) {
    const search = filters.search?.trim();
    return this.db.node.findMany({
      where: {
        cropId: filters.cropId,
        status: filters.status,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { deviceId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: nodeDetails,
      orderBy: [{ name: 'asc' }],
    });
  }

  listForMap(filters: MapNodeFilters = {}) {
    return this.db.node.findMany({
      where: {
        cropId: filters.cropId,
        stateId: filters.stateId,
        status: filters.connection,
      },
      select: {
        id: true,
        deviceId: true,
        name: true,
        posX: true,
        posY: true,
        status: true,
        battery: true,
        lastReading: true,
        crop: { select: { id: true, name: true } },
        state: { select: { id: true, name: true, isActive: true } },
        readings: {
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          take: 1,
        },
        alerts: {
          where: { status: { not: 'CERRADA' } },
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { id: true, severity: true, status: true, message: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.db.node.findUnique({ where: { id }, include: nodeDetails });
  }

  findByDeviceId(deviceId: string) {
    return this.db.node.findUnique({ where: { deviceId } });
  }

  create(data: Prisma.NodeUncheckedCreateInput) {
    return this.db.node.create({ data, include: nodeDetails });
  }

  update(id: string, data: Prisma.NodeUncheckedUpdateInput) {
    return this.db.node.update({ where: { id }, data, include: nodeDetails });
  }

  delete(id: string) {
    return this.db.node.delete({ where: { id }, include: nodeDetails });
  }

  updatePosition(id: string, posX: number, posY: number) {
    return this.update(id, { posX, posY });
  }

  updateStatus(id: string, status: NodeStatus, battery?: number | null) {
    return this.update(id, { status, battery });
  }

  findByCrop(cropId: string) {
    return this.list({ cropId });
  }

  async getOptions() {
    return this.db.crop.findMany({
      select: {
        id: true,
        name: true,
        states: { select: { id: true, name: true, isActive: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
