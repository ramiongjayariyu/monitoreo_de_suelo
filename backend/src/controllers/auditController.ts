import type { RequestHandler } from 'express';
import { z } from 'zod';
import { AuditService } from '@/services/auditService';
import { AppError } from '@/utils/appError';

const auditService = new AuditService();
const filtersSchema = z
  .object({
    userId: z.cuid().optional(),
    action: z.string().trim().min(1).max(100).optional(),
    entity: z.string().trim().min(1).max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export const listAudit: RequestHandler = async (request, response) => {
  const parsed = filtersSchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(
      `Filtros de auditoría inválidos: ${parsed.error.issues.map((issue) => issue.message).join(' ')}`,
      400,
    );
  }
  response.json(await auditService.list(parsed.data));
};
