import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { getConfig, updateConfig } from '@/controllers/configController';
import { authenticate, authorize } from '@/middlewares/authenticate';

export const configRouter = Router();

configRouter.use(authenticate, authorize(UserRole.ADMIN));
configRouter.get('/', getConfig);
configRouter.put('/', updateConfig);
