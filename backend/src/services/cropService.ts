import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { CropRepository, type CropFilters } from '@/repositories/cropRepository';
import { AppError } from '@/utils/appError';

export interface CropInput {
  name: string;
  description?: string | null;
  ranges: Prisma.InputJsonValue;
}

export type CropUpdateInput = Partial<CropInput>;

export class CropService {
  constructor(private readonly crops = new CropRepository()) {}

  list(filters: CropFilters = {}) {
    return this.crops.list(filters);
  }

  async create(input: CropInput, actorId: string) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const crop = await new CropRepository(transaction).create(input);
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_CREATED',
            entity: 'Crop',
            entityId: crop.id,
            changes: { after: this.auditSnapshot(crop) },
          },
        });
        return crop;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new AppError('Ya existe un cultivo con ese nombre.', 409);
      throw error;
    }
  }

  async update(id: string, input: CropUpdateInput, actorId: string) {
    const current = await this.requireCrop(id);
    try {
      return await prisma.$transaction(async (transaction) => {
        const crop = await new CropRepository(transaction).update(id, input);
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_UPDATED',
            entity: 'Crop',
            entityId: id,
            changes: { before: this.auditSnapshot(current), after: this.auditSnapshot(crop) },
          },
        });
        return crop;
      });
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new AppError('Ya existe un cultivo con ese nombre.', 409);
      throw error;
    }
  }

  async delete(id: string, actorId: string): Promise<void> {
    const crop = await this.requireCrop(id);
    const [nodes, states] = await Promise.all([
      this.crops.countNodes(id),
      this.crops.countStates(id),
    ]);
    if (nodes > 0 || states > 0) {
      const nodeLabel = nodes === 1 ? '1 nodo' : `${nodes} nodos`;
      const stateLabel = states === 1 ? '1 estado' : `${states} estados`;
      throw new AppError(
        `No se puede eliminar el cultivo porque tiene ${nodeLabel} y ${stateLabel} asociados.`,
        409,
      );
    }

    try {
      await prisma.$transaction(async (transaction) => {
        await new CropRepository(transaction).delete(id);
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_DELETED',
            entity: 'Crop',
            entityId: id,
            changes: { before: this.auditSnapshot(crop) },
          },
        });
      });
    } catch (error) {
      if (isForeignKeyError(error)) {
        throw new AppError(
          'No se puede eliminar el cultivo porque tiene estados o nodos asociados.',
          409,
        );
      }
      throw error;
    }
  }

  private async requireCrop(id: string) {
    const crop = await this.crops.findById(id);
    if (!crop) throw new AppError('El cultivo no existe.', 404);
    return crop;
  }

  private auditSnapshot(crop: {
    id: string;
    name: string;
    description: string | null;
    ranges: Prisma.JsonValue;
  }) {
    return { id: crop.id, name: crop.name, description: crop.description, ranges: crop.ranges };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function isForeignKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
}
