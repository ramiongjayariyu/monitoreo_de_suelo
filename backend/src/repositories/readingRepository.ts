import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

export class ReadingRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  create(data: Prisma.ReadingUncheckedCreateInput) {
    return this.db.reading.create({ data });
  }

  findByNode(nodeId: string, take = 100) {
    return this.db.reading.findMany({
      where: { nodeId },
      orderBy: { timestamp: 'desc' },
      take,
    });
  }

  findByRange(nodeId: string, from: Date, to: Date) {
    return this.db.reading.findMany({
      where: { nodeId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'asc' },
    });
  }

  latestByNode(nodeId: string) {
    return this.db.reading.findFirst({ where: { nodeId }, orderBy: { timestamp: 'desc' } });
  }

  aggregate(nodeId: string, from: Date, to: Date) {
    return this.db.reading.aggregate({
      where: { nodeId, timestamp: { gte: from, lte: to } },
      _avg: { humidity: true, ph: true, salinity: true, soilTemp: true, ambientTemp: true },
      _min: { humidity: true, ph: true, salinity: true, soilTemp: true, ambientTemp: true },
      _max: { humidity: true, ph: true, salinity: true, soilTemp: true, ambientTemp: true },
      _count: { _all: true },
    });
  }
}
