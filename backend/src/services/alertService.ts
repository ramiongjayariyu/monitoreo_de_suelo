import { AlertStatus } from '@prisma/client';
import { AlertRepository, type AlertFilters } from '@/repositories/alertRepository';
import { AppError } from '@/utils/appError';

export class AlertService {
  constructor(private readonly alerts = new AlertRepository()) {}

  list(filters: AlertFilters = {}) {
    return this.alerts.list(filters);
  }

  async updateStatus(id: string, status: AlertStatus) {
    const alert = await this.alerts.updateStatus(id, status);
    if (!alert) throw new AppError('La alerta no existe.', 404);
    return alert;
  }

  countActive() {
    return this.alerts.countActive();
  }
}
