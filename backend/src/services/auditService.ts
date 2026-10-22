import { AuditRepository, type AuditFilters } from '@/repositories/auditRepository';
import { AppError } from '@/utils/appError';

export class AuditService {
  constructor(private readonly audits = new AuditRepository()) {}

  list(input: Omit<AuditFilters, 'page' | 'pageSize'> & { page?: number; pageSize?: number }) {
    if (input.from && Number.isNaN(input.from.getTime())) {
      throw new AppError('La fecha inicial de auditoría no es válida.', 400);
    }
    if (input.to && Number.isNaN(input.to.getTime())) {
      throw new AppError('La fecha final de auditoría no es válida.', 400);
    }
    if (input.from && input.to && input.from > input.to) {
      throw new AppError('La fecha inicial debe ser anterior o igual a la fecha final.', 400);
    }
    return this.audits.list({
      ...input,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 25,
    });
  }
}
