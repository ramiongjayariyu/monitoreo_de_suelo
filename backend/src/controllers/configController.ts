import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ConfigService, configVariables } from '@/services/configService';
import { AppError } from '@/utils/appError';

const configService = new ConfigService();
const thresholdSchema = z
  .object({
    warning: z.number().min(0).max(999),
    critical: z.number().min(0).max(1000),
  })
  .strict()
  .refine((value) => value.warning < value.critical, {
    message: 'El umbral crítico debe superar al de advertencia.',
  });
const thresholdsSchema = z
  .object(
    Object.fromEntries(configVariables.map((variable) => [variable, thresholdSchema])) as Record<
      (typeof configVariables)[number],
      typeof thresholdSchema
    >,
  )
  .strict();
const unitsSchema = z
  .object(
    Object.fromEntries(
      configVariables.map((variable) => [variable, z.string().trim().min(1).max(20)]),
    ) as Record<(typeof configVariables)[number], z.ZodString>,
  )
  .strict();
const systemSchema = z
  .object({
    defaultSamplingFrequency: z.number().int().min(5).max(86400),
    units: unitsSchema,
    timeZone: z.string().trim().min(1).max(100),
    language: z.literal('es'),
  })
  .strict();
const updateSchema = z
  .object({
    severityThresholds: thresholdsSchema.optional(),
    system: systemSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar una configuración para actualizar.',
  });

function parseQuery<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(
      `Configuración inválida: ${result.error.issues.map((issue) => issue.message).join(' ')}`,
      400,
    );
  }
  return result.data;
}

export const getConfig: RequestHandler = async (_request, response) => {
  response.json(await configService.get());
};

export const updateConfig: RequestHandler = async (request, response) => {
  const input = parseQuery(updateSchema, request.body);
  const userId = request.auth?.userId;
  if (!userId) throw new AppError('Autenticación requerida.', 401);
  if (input.system) {
    try {
      new Intl.DateTimeFormat('es', { timeZone: input.system.timeZone });
    } catch {
      throw new AppError('La zona horaria indicada no es válida.', 400);
    }
  }
  response.json(await configService.update(input, userId));
};
