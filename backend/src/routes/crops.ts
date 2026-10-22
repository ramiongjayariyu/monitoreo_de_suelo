import { UserRole } from '@prisma/client';
import { Router } from 'express';
import * as cropController from '@/controllers/cropController';
import * as cropStateController from '@/controllers/cropStateController';
import { authenticate, authorize } from '@/middlewares/authenticate';
import { validate } from '@/middlewares/validate';

export const cropRouter = Router();

cropRouter.use(authenticate);
cropRouter.get('/', cropController.listCrops);
cropRouter.get('/:id/states', cropStateController.listCropStates);
cropRouter.post(
  '/:id/states',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(cropStateController.createBodySchema),
  cropStateController.createCropState,
);
cropRouter.put(
  '/states/:id',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(cropStateController.updateBodySchema),
  cropStateController.updateCropState,
);
cropRouter.patch(
  '/states/:id/activate',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  cropStateController.activateCropState,
);
cropRouter.delete(
  '/states/:id',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  cropStateController.deleteCropState,
);
cropRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(cropController.cropBodySchema),
  cropController.createCrop,
);
cropRouter.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.OPERADOR),
  validate(cropController.updateBodySchema),
  cropController.updateCrop,
);
cropRouter.delete('/:id', authorize(UserRole.ADMIN, UserRole.OPERADOR), cropController.deleteCrop);
