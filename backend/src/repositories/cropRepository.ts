import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/config/db';

const cropDetails = {
  _count: { select: { nodes: true, states: true } },
} satisfies Prisma.CropInclude;

export interface CropFilters {
  search?: string;
}

export class CropRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  list(filters: CropFilters = {}) {
    const search = filters.search?.trim();
    return this.db.crop.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      include: cropDetails,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.db.crop.findUnique({ where: { id }, include: cropDetails });
  }

  create(input: { name: string; description?: string | null; ranges: Prisma.InputJsonValue }) {
    return this.db.crop.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        ranges: input.ranges,
      },
      include: cropDetails,
    });
  }

  update(
    id: string,
    input: { name?: string; description?: string | null; ranges?: Prisma.InputJsonValue },
  ) {
    return this.db.crop.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.ranges !== undefined ? { ranges: input.ranges } : {}),
      },
      include: cropDetails,
    });
  }

  delete(id: string) {
    return this.db.crop.delete({ where: { id } });
  }

  countNodes(id: string) {
    return this.db.node.count({ where: { cropId: id } });
  }

  countStates(id: string) {
    return this.db.cropState.count({ where: { cropId: id } });
  }
}
