import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { listAudit } from '@/controllers/auditController';
import { authenticate, authorize } from '@/middlewares/authenticate';

export const auditRouter = Router();

auditRouter.use(authenticate, authorize(UserRole.ADMIN));
auditRouter.get('/', listAudit);
