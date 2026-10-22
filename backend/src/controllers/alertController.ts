import { AlertSeverity, AlertStatus } from '@prisma/client';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AlertService } from '@/services/alertService';
import { AppError } from '@/utils/appError';
import { emitToConnectedUsers } from '@/sockets';

const alertService = new AlertService();
const filtersSchema = z
  .object({
    nodeId: z.cuid().optional(),
    severity: z.nativeEnum(AlertSeverity).optional(),
    variable: z.enum(['humidity', 'ph', 'salinity', 'soilTemp', 'ambientTemp']).optional(),
    status: z.nativeEnum(AlertStatus).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    take: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict()
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: 'La fecha inicial debe ser anterior o igual a la fecha final.',
  });

function routeId(id: string | string[] | undefined): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new AppError('El identificador de la alerta no es válido.', 400);
  }
  return id;
}

export const listAlerts: RequestHandler = async (request, response) => {
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
  const { take, ...filters } = parsed.data;
  response.json({
    alerts: await alertService.list({ ...filters, take }),
    activeCount: await alertService.countActive(),
  });
};

function updateStatus(status: AlertStatus): RequestHandler {
  return async (request, response) => {
    const alert = await alertService.updateStatus(routeId(request.params.id), status);
    emitToConnectedUsers('alert:updated', alert);
    response.json({ alert });
  };
}

export const markAlertRead = updateStatus(AlertStatus.LEIDA);
export const silenceAlert = updateStatus(AlertStatus.SILENCIADA);
export const closeAlert = updateStatus(AlertStatus.CERRADA);
