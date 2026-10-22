import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HistoryService, historyVariables } from '@/services/historyService';
import { AppError } from '@/utils/appError';

const historyService = new HistoryService();
const dateSchema = z.iso.datetime({ offset: true });
const rangeShape = {
  from: dateSchema.optional(),
  to: dateSchema.optional(),
};
const seriesSchema = z
  .object({
    nodeId: z.cuid(),
    variable: z.enum(historyVariables),
    ...rangeShape,
    granularity: z.enum(['hour', 'day', 'week']).default('hour'),
  })
  .strict();
const compareSchema = z
  .object({
    nodeIds: z.string().transform((value) => value.split(',')),
    variable: z.enum(historyVariables),
    ...rangeShape,
    granularity: z.enum(['hour', 'day', 'week']).default('hour'),
  })
  .strict()
  .refine(
    ({ nodeIds }) =>
      nodeIds.length >= 2 &&
      nodeIds.length <= 10 &&
      new Set(nodeIds).size === nodeIds.length &&
      nodeIds.every((nodeId) => z.cuid().safeParse(nodeId).success),
    { message: 'Selecciona entre 2 y 10 nodos válidos y sin repetir.', path: ['nodeIds'] },
  );
const correlationSchema = z
  .object({
    nodeId: z.cuid(),
    varA: z.enum(historyVariables),
    varB: z.enum(historyVariables),
    ...rangeShape,
  })
  .strict()
  .refine(({ varA, varB }) => varA !== varB, {
    message: 'Selecciona dos variables diferentes.',
    path: ['varB'],
  });

function parseQuery<T extends z.ZodType>(schema: T, query: unknown): z.output<T> {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(
      `Filtros inválidos: ${parsed.error.issues.map((issue) => issue.message).join(' ')}`,
      400,
    );
  }
  return parsed.data;
}

export const getHistory: RequestHandler = async (request, response) => {
  const filters = parseQuery(seriesSchema, request.query);
  response.json(
    await historyService.getSeries(filters.nodeId, filters.variable, filters, filters.granularity),
  );
};

export const compareHistory: RequestHandler = async (request, response) => {
  const filters = parseQuery(compareSchema, request.query);
  response.json(
    await historyService.compareNodes(
      filters.nodeIds,
      filters.variable,
      filters,
      filters.granularity,
    ),
  );
};

export const getCorrelation: RequestHandler = async (request, response) => {
  const filters = parseQuery(correlationSchema, request.query);
  response.json(
    await historyService.getCorrelation(filters.nodeId, filters.varA, filters.varB, filters),
  );
};
