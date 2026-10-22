import type { RequestHandler } from 'express';
import { z } from 'zod';
import { DashboardService, parseDashboardFilters } from '@/services/dashboardService';
import { AppError } from '@/utils/appError';

const dashboardService = new DashboardService();
const filtersSchema = z
  .object({
    nodeId: z.cuid().optional(),
    cropId: z.cuid().optional(),
    period: z.enum(['24h', '7d', '30d']).optional(),
  })
  .strict();

export const getDashboard: RequestHandler = async (request, response) => {
  const parsed = filtersSchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(
      `Filtros inválidos: ${parsed.error.issues.map((issue) => issue.message).join(' ')}`,
      400,
    );
  }
  response.json(await dashboardService.getDashboard(parseDashboardFilters(parsed.data)));
};
