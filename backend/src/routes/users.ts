import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import * as userController from '@/controllers/userController';
import { authenticate, authorize } from '@/middlewares/authenticate';
import { validate } from '@/middlewares/validate';
import { auditLogger } from '@/middlewares/auditLogger';

const email = z.email().trim().toLowerCase();
const password = z.string().min(12, 'La contraseña debe tener al menos 12 caracteres.');
const role = z.enum([UserRole.ADMIN, UserRole.OPERADOR, UserRole.CONSULTA]);

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    role,
    password,
  })
  .strict();

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: email.optional(),
    role: role.optional(),
    active: z.boolean().optional(),
    password: password.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar al menos un campo para actualizar.',
  });

export const userRouter = Router();

userRouter.use(authenticate, authorize(UserRole.ADMIN));
userRouter.get('/', userController.listUsers);
userRouter.post(
  '/',
  validate(createSchema),
  auditLogger('User', 'USER_CREATED'),
  userController.createUser,
);
userRouter.put(
  '/:id',
  validate(updateSchema),
  auditLogger('User', 'USER_UPDATED'),
  userController.updateUser,
);
userRouter.delete('/:id', auditLogger('User', 'USER_DEACTIVATED'), userController.deactivateUser);
