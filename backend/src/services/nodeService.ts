import { NodeStatus } from '@prisma/client';
import { prisma } from '@/config/db';
import {
  NodeRepository,
  type MapNodeFilters,
  type NodeFilters,
} from '@/repositories/nodeRepository';
import { AppError } from '@/utils/appError';
import { ConfigService } from '@/services/configService';

export interface NodeInput {
  deviceId: string;
  name: string;
  notes?: string | null;
  posX?: number;
  posY?: number;
  samplingFreq?: number;
  cropId?: string | null;
  stateId?: string | null;
}

export type NodeUpdateInput = Partial<NodeInput>;

export class NodeService {
  constructor(private readonly nodes = new NodeRepository()) {}

  list(filters: NodeFilters = {}) {
    return this.nodes.list(filters);
  }

  async listForMap(filters: MapNodeFilters & { alertLevel?: string } = {}) {
    const { alertLevel, ...nodeFilters } = filters;
    const nodes = await this.nodes.listForMap(nodeFilters);
    const withAlertLevel = nodes.map((node) => ({
      ...node,
      alertLevel: node.alerts[0]?.severity ?? 'NONE',
      mapStatus:
        node.status === NodeStatus.OFFLINE || !node.readings[0]
          ? 'offline'
          : node.alerts[0]?.severity === 'CRITICA'
            ? 'critical'
            : node.alerts[0]?.severity === 'ADVERTENCIA'
              ? 'warning'
              : 'optimal',
    }));
    return alertLevel
      ? withAlertLevel.filter((node) => node.alertLevel === alertLevel)
      : withAlertLevel;
  }

  getOptions() {
    return this.nodes.getOptions();
  }

  async create(input: NodeInput, actorId: string) {
    await this.validateAssignment(input.cropId, input.stateId);
    const defaultSamplingFrequency =
      input.samplingFreq ?? (await new ConfigService().get()).system.defaultSamplingFrequency;
    if (await this.nodes.findByDeviceId(input.deviceId.trim())) {
      throw new AppError('Ya existe un nodo con ese ID de dispositivo.', 409);
    }
    try {
      return await prisma.$transaction(async (transaction) => {
        const repository = new NodeRepository(transaction);
        const node = await repository.create({
          deviceId: input.deviceId.trim(),
          name: input.name.trim(),
          notes: input.notes?.trim() || null,
          posX: input.posX ?? 50,
          posY: input.posY ?? 50,
          samplingFreq: defaultSamplingFrequency,
          cropId: input.cropId || null,
          stateId: input.stateId || null,
        });
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'NODE_CREATED',
            entity: 'Node',
            entityId: node.id,
            changes: { after: this.auditSnapshot(node) },
          },
        });
        return node;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError('Ya existe un nodo con ese ID de dispositivo.', 409);
      }
      throw error;
    }
  }

  async update(id: string, input: NodeUpdateInput, actorId: string) {
    const current = await this.requireNode(id);
    await this.validateAssignment(
      input.cropId === undefined ? current.cropId : input.cropId,
      input.stateId === undefined ? current.stateId : input.stateId,
    );
    try {
      return await prisma.$transaction(async (transaction) => {
        const node = await new NodeRepository(transaction).update(id, {
          ...(input.deviceId !== undefined ? { deviceId: input.deviceId.trim() } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
          ...(input.posX !== undefined ? { posX: input.posX } : {}),
          ...(input.posY !== undefined ? { posY: input.posY } : {}),
          ...(input.samplingFreq !== undefined ? { samplingFreq: input.samplingFreq } : {}),
          ...(input.cropId !== undefined ? { cropId: input.cropId } : {}),
          ...(input.stateId !== undefined ? { stateId: input.stateId } : {}),
        });
        await transaction.auditLog.create({
          data: {
            userId: actorId,
            action: 'NODE_UPDATED',
            entity: 'Node',
            entityId: id,
            changes: { before: this.auditSnapshot(current), after: this.auditSnapshot(node) },
          },
        });
        return node;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError('Ya existe un nodo con ese ID de dispositivo.', 409);
      }
      throw error;
    }
  }

  async updatePosition(id: string, posX: number, posY: number, actorId: string) {
    return this.update(id, { posX, posY }, actorId);
  }

  async assign(
    id: string,
    input: { cropId: string | null; stateId: string | null },
    actorId: string,
  ) {
    return this.update(id, input, actorId);
  }

  async updateStatus(id: string, status: NodeStatus, battery?: number | null) {
    await this.requireNode(id);
    return this.nodes.updateStatus(id, status, battery);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const node = await this.requireNode(id);
    const { readings, alerts } = node._count;
    if (readings > 0 || alerts > 0) {
      const readingLabel = readings === 1 ? '1 lectura' : `${readings} lecturas`;
      const alertLabel = alerts === 1 ? '1 alerta' : `${alerts} alertas`;
      throw new AppError(
        `No se puede eliminar el nodo porque tiene ${readingLabel} y ${alertLabel} asociadas.`,
        409,
      );
    }

    await prisma.$transaction(async (transaction) => {
      await new NodeRepository(transaction).delete(id);
      await transaction.auditLog.create({
        data: {
          userId: actorId,
          action: 'NODE_DELETED',
          entity: 'Node',
          entityId: id,
          changes: { before: this.auditSnapshot(node) },
        },
      });
    });
  }

  private async requireNode(id: string) {
    const node = await this.nodes.findById(id);
    if (!node) throw new AppError('El nodo no existe.', 404);
    return node;
  }

  private async validateAssignment(cropId?: string | null, stateId?: string | null) {
    if (stateId && !cropId) {
      throw new AppError('Debes seleccionar un cultivo antes de asignar un estado.', 400);
    }
    if (cropId) {
      const crop = await prisma.crop.findUnique({ where: { id: cropId }, select: { id: true } });
      if (!crop) throw new AppError('El cultivo seleccionado no existe.', 400);
    }
    if (stateId) {
      const state = await prisma.cropState.findUnique({
        where: { id: stateId },
        select: { cropId: true },
      });
      if (!state) throw new AppError('El estado seleccionado no existe.', 400);
      if (state.cropId !== cropId) {
        throw new AppError('El estado seleccionado no pertenece al cultivo indicado.', 400);
      }
    }
  }

  private auditSnapshot(node: {
    id: string;
    deviceId: string;
    name: string;
    notes: string | null;
    posX: number;
    posY: number;
    cropId: string | null;
    stateId: string | null;
    samplingFreq: number;
    status: NodeStatus;
    battery: number | null;
  }) {
    return {
      id: node.id,
      deviceId: node.deviceId,
      name: node.name,
      notes: node.notes,
      posX: node.posX,
      posY: node.posY,
      cropId: node.cropId,
      stateId: node.stateId,
      samplingFreq: node.samplingFreq,
      status: node.status,
      battery: node.battery,
    };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
