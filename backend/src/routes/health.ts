import { Router } from 'express';
import { prisma } from '../config/db';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});
