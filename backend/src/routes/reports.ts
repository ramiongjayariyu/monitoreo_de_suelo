import { Router } from 'express';
import {
  createReportShare,
  downloadSharedReport,
  exportReport,
  getReportPreview,
  listReportHistory,
} from '@/controllers/reportController';
import { authenticate } from '@/middlewares/authenticate';

export const reportRouter = Router();

reportRouter.get('/share/:token', downloadSharedReport);
reportRouter.use(authenticate);
reportRouter.get('/general', getReportPreview);
reportRouter.get('/export', exportReport);
reportRouter.get('/history', listReportHistory);
reportRouter.post('/share', createReportShare);
