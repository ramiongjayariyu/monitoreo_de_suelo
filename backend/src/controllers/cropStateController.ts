import type { RequestHandler } from 'express';
import { z } from 'zod';
import { rangesSchema } from '@/controllers/cropController';
import { CropStateService } from '@/services/cropStateService';
import { AppError } from '@/utils/appError';

const cropStateService = new CropStateService();

export const createBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    order: z.number().int().positive(),
    isActive: z.boolean().optional(),
    ranges: rangesSchema,
  })
  .strict();

export const updateBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    order: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    ranges: rangesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar al menos un campo para actualizar.',
  });

function actorId(userId: string | undefined): string {
  if (!userId) throw new AppError('Autenticación requerida.', 401);
  return userId;
}

function routeId(id: string | string[] | undefined): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new AppError('El identificador del estado no es válido.', 400);
  }
  return id;
}

export const listCropStates: RequestHandler = async (request, response) => {
  response.json({ ...(await cropStateService.list(routeId(request.params.id))) });
};

export const createCropState: RequestHandler = async (request, response) => {
  const state = await cropStateService.create(
    routeId(request.params.id),
    request.body,
    actorId(request.auth?.userId),
  );
  response.status(201).json({ state });
};

export const updateCropState: RequestHandler = async (request, response) => {
  const state = await cropStateService.update(
    routeId(request.params.id),
    request.body,
    actorId(request.auth?.userId),
  );
  response.json({ state });
};

export const activateCropState: RequestHandler = async (request, response) => {
  const state = await cropStateService.activate(
    routeId(request.params.id),
    actorId(request.auth?.userId),
  );
  response.json({ state });
};

export const deleteCropState: RequestHandler = async (request, response) => {
  await cropStateService.delete(routeId(request.params.id), actorId(request.auth?.userId));
  response.status(204).end();
};
