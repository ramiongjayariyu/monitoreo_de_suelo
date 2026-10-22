import type { RequestHandler } from 'express';
import { z } from 'zod';
import { CropService } from '@/services/cropService';
import { AppError } from '@/utils/appError';

const cropService = new CropService();
export const rangesSchema = z
  .object({
    humidity: z.object({ min: z.number(), max: z.number() }).strict(),
    ph: z.object({ min: z.number(), max: z.number() }).strict(),
    salinity: z.object({ min: z.number(), max: z.number() }).strict(),
    soilTemp: z.object({ min: z.number(), max: z.number() }).strict(),
    ambientTemp: z.object({ min: z.number(), max: z.number() }).strict(),
  })
  .strict()
  .superRefine((ranges, context) => {
    for (const [variable, range] of Object.entries(ranges)) {
      if (range.min >= range.max) {
        context.addIssue({
          code: 'custom',
          path: [variable],
          message: 'El valor mínimo debe ser menor que el máximo.',
        });
      }
    }
  });

const cropBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000).nullable().optional(),
    ranges: rangesSchema,
  })
  .strict();

const updateBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
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
    throw new AppError('El identificador del cultivo no es válido.', 400);
  }
  return id;
}

export const listCrops: RequestHandler = async (request, response) => {
  const query = z
    .object({ search: z.string().trim().max(100).optional() })
    .strict()
    .safeParse(request.query);
  if (!query.success) {
    response.status(400).json({
      status: 'error',
      message: 'Filtros inválidos.',
      issues: query.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  response.json({ crops: await cropService.list(query.data) });
};

export const createCrop: RequestHandler = async (request, response) => {
  const crop = await cropService.create(request.body, actorId(request.auth?.userId));
  response.status(201).json({ crop });
};

export const updateCrop: RequestHandler = async (request, response) => {
  const crop = await cropService.update(
    routeId(request.params.id),
    request.body,
    actorId(request.auth?.userId),
  );
  response.json({ crop });
};

export const deleteCrop: RequestHandler = async (request, response) => {
  await cropService.delete(routeId(request.params.id), actorId(request.auth?.userId));
  response.status(204).end();
};

export { cropBodySchema, updateBodySchema };
