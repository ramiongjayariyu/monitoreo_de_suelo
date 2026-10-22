import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { CropStateRepository } from '@/repositories/cropStateRepository';
import { AppError } from '@/utils/appError';

export interface CropStateInput {
  name: string;
  order: number;
  isActive?: boolean;
  ranges: Prisma.InputJsonValue;
}

export type CropStateUpdateInput = Partial<CropStateInput>;

export class CropStateService {
  constructor(private readonly states = new CropStateRepository()) {}

  async list(cropId: string) {
    const crop = await this.states.findCrop(cropId);
    if (!crop) throw new AppError('El cultivo no existe.', 404);
    const states = await this.states.listByCrop(cropId);
    return { crop, states };
  }

  async create(cropId: string, input: CropStateInput, actorId: string) {
    const crop = await this.states.findCrop(cropId);
    if (!crop) throw new AppError('El cultivo no existe.', 404);
    try {
      return await prisma.$transaction(async (transaction) => {
        const repository = new CropStateRepository(transaction);
        if (input.isActive) {
          await transaction.cropState.updateMany({
            where: { cropId, isActive: true },
            data: { isActive: false },
          });
        }
        const state = await repository.create({
          cropId,
          name: input.name.trim(),
          order: input.order,
          isActive: input.isActive ?? false,
          ranges: input.ranges,
        });
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_STATE_CREATED',
            entity: 'CropState',
            entityId: state.id,
            changes: { after: this.auditSnapshot(state) },
          },
        });
        return state;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          'La operación entra en conflicto con otro estado del cultivo (nombre, orden o vigencia).',
          409,
        );
      }
      throw error;
    }
  }

  async update(id: string, input: CropStateUpdateInput, actorId: string) {
    const current = await this.requireState(id);
    try {
      return await prisma.$transaction(async (transaction) => {
        const repository = new CropStateRepository(transaction);
        if (input.isActive === true) {
          await transaction.cropState.updateMany({
            where: { cropId: current.cropId, isActive: true, id: { not: id } },
            data: { isActive: false },
          });
        }
        const state = await repository.update(id, {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.ranges !== undefined ? { ranges: input.ranges } : {}),
        });
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_STATE_UPDATED',
            entity: 'CropState',
            entityId: id,
            changes: { before: this.auditSnapshot(current), after: this.auditSnapshot(state) },
          },
        });
        return state;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          'La operación entra en conflicto con otro estado del cultivo (nombre, orden o vigencia).',
          409,
        );
      }
      throw error;
    }
  }

  async activate(id: string, actorId: string) {
    const current = await this.requireState(id);
    if (current.isActive) return current;
    try {
      return await prisma.$transaction(async (transaction) => {
        const state = await new CropStateRepository(transaction).activate(current.cropId, id);
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_STATE_ACTIVATED',
            entity: 'CropState',
            entityId: id,
            changes: {
              before: { id: current.id, isActive: current.isActive },
              after: { id: state.id, isActive: state.isActive },
            },
          },
        });
        return state;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          'No se pudo activar el estado porque otro estado quedó vigente. Inténtalo de nuevo.',
          409,
        );
      }
      throw error;
    }
  }

  async delete(id: string, actorId: string): Promise<void> {
    const state = await this.requireState(id);
    if (state.isActive) {
      throw new AppError(
        'No se puede eliminar el estado vigente. Activa otro estado primero.',
        409,
      );
    }
    if (state._count.nodes > 0) {
      const nodeLabel = state._count.nodes === 1 ? '1 nodo' : `${state._count.nodes} nodos`;
      throw new AppError(
        `No se puede eliminar el estado porque tiene ${nodeLabel} asociados.`,
        409,
      );
    }

    try {
      await prisma.$transaction(async (transaction) => {
        await new CropStateRepository(transaction).delete(id);
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'CROP_STATE_DELETED',
            entity: 'CropState',
            entityId: id,
            changes: { before: this.auditSnapshot(state) },
          },
        });
      });
    } catch (error) {
      if (isForeignKeyError(error)) {
        throw new AppError('No se puede eliminar el estado porque tiene nodos asociados.', 409);
      }
      throw error;
    }
  }

  private async requireState(id: string) {
    const state = await this.states.findById(id);
    if (!state) throw new AppError('El estado del cultivo no existe.', 404);
    return state;
  }

  private auditSnapshot(state: {
    id: string;
    cropId: string;
    name: string;
    order: number;
    isActive: boolean;
    ranges: Prisma.JsonValue;
  }) {
    return {
      id: state.id,
      cropId: state.cropId,
      name: state.name,
      order: state.order,
      isActive: state.isActive,
      ranges: state.ranges,
    };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function isForeignKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
}
