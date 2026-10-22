import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

const stateDetails = {
  _count: { select: { nodes: true } },
} satisfies Prisma.CropStateInclude;

export class CropStateRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  findCrop(cropId: string) {
    return this.db.crop.findUnique({
      where: { id: cropId },
      select: { id: true, name: true, description: true, ranges: true },
    });
  }

  listByCrop(cropId: string) {
    return this.db.cropState.findMany({
      where: { cropId },
      include: stateDetails,
      orderBy: { order: 'asc' },
    });
  }

  findById(id: string) {
    return this.db.cropState.findUnique({ where: { id }, include: stateDetails });
  }

  findVigente(cropId: string) {
    return this.db.cropState.findFirst({
      where: { cropId, isActive: true },
      include: stateDetails,
    });
  }

  create(input: {
    cropId: string;
    name: string;
    order: number;
    isActive: boolean;
    ranges: Prisma.InputJsonValue;
  }) {
    return this.db.cropState.create({ data: input, include: stateDetails });
  }

  update(id: string, data: Prisma.CropStateUncheckedUpdateInput) {
    return this.db.cropState.update({ where: { id }, data, include: stateDetails });
  }

  async activate(cropId: string, id: string) {
    await this.db.cropState.updateMany({
      where: { cropId, isActive: true, id: { not: id } },
      data: { isActive: false },
    });
    return this.db.cropState.update({
      where: { id },
      data: { isActive: true },
      include: stateDetails,
    });
  }

  delete(id: string) {
    return this.db.cropState.delete({ where: { id } });
  }
}
