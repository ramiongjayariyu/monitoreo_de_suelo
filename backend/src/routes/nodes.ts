import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import * as nodeController from '@/controllers/nodeController';
import { authenticate, authorize } from '@/middlewares/authenticate';
import { validate } from '@/middlewares/validate';

const nullableId = z.cuid().nullable();
const coordinates = {
  posX: z.number().min(0).max(100),
  posY: z.number().min(0).max(100),
};
const createSchema = z
  .object({
    deviceId: z.string().trim().min(1).max(100),
    name: z.string().trim().min(2).max(100),
    notes: z.string().trim().max(1000).nullable().optional(),
    posX: coordinates.posX.default(50),
    posY: coordinates.posY.default(50),
    samplingFreq: z.number().int().min(5).max(86400).optional(),
    cropId: nullableId.optional(),
    stateId: nullableId.optional(),
  })
  .strict();

const updateSchema = z
  .object({
    deviceId: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().min(2).max(100).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    posX: coordinates.posX.optional(),
    posY: coordinates.posY.optional(),
    samplingFreq: z.number().int().min(5).max(86400).optional(),
    cropId: nullableId.optional(),
    stateId: nullableId.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar al menos un campo para actualizar.',
  });

const positionSchema = z.object(coordinates).strict();
const assignSchema = z
  .object({
    cropId: nullableId,
    stateId: nullableId,
  })
  .strict();

export const nodeRouter = Router();

nodeRouter.use(authenticate);
nodeRouter.get('/', nodeController.listNodes);
nodeRouter.get('/options', nodeController.nodeOptions);
nodeRouter.get('/map', nodeController.mapNodes);
nodeRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(createSchema),
  nodeController.createNode,
);
nodeRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(updateSchema),
  nodeController.updateNode,
);
nodeRouter.delete('/:id', authorize(UserRole.ADMIN, UserRole.OPERADOR), nodeController.deleteNode);
nodeRouter.patch(
  '/:id/position',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(positionSchema),
  nodeController.updatePosition,
);
nodeRouter.patch(
  '/:id/assign',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(assignSchema),
  nodeController.assignNode,
);
