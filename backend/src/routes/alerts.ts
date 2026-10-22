import { Router } from 'express';
import * as alertController from '@/controllers/alertController';
import { authenticate } from '@/middlewares/authenticate';
import { auditLogger } from '@/middlewares/auditLogger';

export const alertRouter = Router();

alertRouter.use(authenticate);
alertRouter.get('/', alertController.listAlerts);
alertRouter.patch('/:id/read', auditLogger('Alert', 'ALERT_READ'), alertController.markAlertRead);
alertRouter.patch(
  '/:id/silence',
  auditLogger('Alert', 'ALERT_SILENCED'),
  alertController.silenceAlert,
);
alertRouter.patch('/:id/close', auditLogger('Alert', 'ALERT_CLOSED'), alertController.closeAlert);
