import type { RequestHandler } from 'express';
import { prisma } from '@/config/db';

export function auditLogger(entity: string, action: string): RequestHandler {
  return (request, response, next) => {
    response.once('finish', () => {
      if (response.statusCode < 200 || response.statusCode >= 400) return;
      void prisma.auditLog
        .create({
          data: {
            userId: request.auth?.userId ?? null,
            action,
            entity,
            entityId: typeof request.params.id === 'string' ? request.params.id : null,
            changes: {
              method: request.method,
              path: request.route?.path ?? request.path,
              statusCode: response.statusCode,
            },
          },
        })
        .catch((error: unknown) => {
          console.error(`No se pudo registrar la auditoría ${action}:`, error);
        });
    });
    next();
  };
}
