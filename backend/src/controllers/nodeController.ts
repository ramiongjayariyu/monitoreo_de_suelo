import { NodeStatus } from '@prisma/client';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { NodeService } from '@/services/nodeService';
import { AppError } from '@/utils/appError';

const nodeService = new NodeService();
const filtersSchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    cropId: z.cuid().optional(),
    status: z.enum([NodeStatus.ONLINE, NodeStatus.OFFLINE]).optional(),
  })
  .strict();
const mapFiltersSchema = z
  .object({
    cropId: z.cuid().optional(),
    state: z.cuid().optional(),
    connection: z.enum([NodeStatus.ONLINE, NodeStatus.OFFLINE]).optional(),
    alertLevel: z.enum(['INFO', 'ADVERTENCIA', 'CRITICA', 'NONE']).optional(),
  })
  .strict();

function actorId(userId: string | undefined): string {
  if (!userId) throw new AppError('Autenticación requerida.', 401);
  return userId;
}

function routeId(id: string | string[] | undefined): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new AppError('El identificador del nodo no es válido.', 400);
  }
  return id;
}

export const listNodes: RequestHandler = async (request, response) => {
  const parsed = filtersSchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      status: 'error',
      message: 'Filtros inválidos.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  response.json({ nodes: await nodeService.list(parsed.data) });
};

export const nodeOptions: RequestHandler = async (_request, response) => {
  response.json({ crops: await nodeService.getOptions() });
};

export const mapNodes: RequestHandler = async (request, response) => {
  const parsed = mapFiltersSchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      status: 'error',
      message: 'Filtros del mapa inválidos.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  response.json({
    nodes: await nodeService.listForMap({
      cropId: parsed.data.cropId,
      stateId: parsed.data.state,
      connection: parsed.data.connection,
      alertLevel: parsed.data.alertLevel,
    }),
  });
};

export const createNode: RequestHandler = async (request, response) => {
  const node = await nodeService.create(request.body, actorId(request.auth?.userId));
  response.status(201).json({ node });
};

export const updateNode: RequestHandler = async (request, response) => {
  const node = await nodeService.update(
    routeId(request.params.id),
    request.body,
    actorId(request.auth?.userId),
  );
  response.json({ node });
};

export const deleteNode: RequestHandler = async (request, response) => {
  await nodeService.delete(routeId(request.params.id), actorId(request.auth?.userId));
  response.status(204).end();
};

export const updatePosition: RequestHandler = async (request, response) => {
  const node = await nodeService.updatePosition(
    routeId(request.params.id),
    request.body.posX,
    request.body.posY,
    actorId(request.auth?.userId),
  );
  response.json({ node });
};

export const assignNode: RequestHandler = async (request, response) => {
  const node = await nodeService.assign(
    routeId(request.params.id),
    request.body,
    actorId(request.auth?.userId),
  );
  response.json({ node });
};
