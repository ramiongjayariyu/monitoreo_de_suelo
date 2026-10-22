import { Router } from 'express';
import { z } from 'zod';
import * as authController from '@/controllers/authController';
import { authenticate } from '@/middlewares/authenticate';
import { validate } from '@/middlewares/validate';
import { auditLogger } from '@/middlewares/auditLogger';

const email = z.email().trim().toLowerCase();
const password = z.string().min(12, 'La contraseña debe tener al menos 12 caracteres.');

const loginSchema = z
  .object({
    email,
    password: z.string().min(1),
    twoFactorCode: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict();

const refreshSchema = z.object({ refreshToken: z.string().min(1) }).strict();
const forgotSchema = z.object({ email }).strict();
const resetSchema = z.object({ token: z.string().min(32), newPassword: password }).strict();
const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
  })
  .strict();
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: password,
  })
  .strict();
const verifyTwoFactorSchema = z.object({ token: z.string().regex(/^\d{6}$/) }).strict();
const disableTwoFactorSchema = z
  .object({
    password: z.string().min(1),
    token: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/refresh', validate(refreshSchema), authController.refresh);
authRouter.post('/logout', validate(refreshSchema), authController.logout);
authRouter.post('/forgot-password', validate(forgotSchema), authController.forgotPassword);
authRouter.post('/reset-password', validate(resetSchema), authController.resetPassword);

authRouter.get('/profile', authenticate, authController.getProfile);
authRouter.patch(
  '/profile',
  authenticate,
  validate(profileSchema),
  auditLogger('User', 'PROFILE_UPDATED'),
  authController.updateProfile,
);
authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);
authRouter.post('/2fa/setup', authenticate, authController.setupTwoFactor);
authRouter.post(
  '/2fa/verify',
  authenticate,
  validate(verifyTwoFactorSchema),
  authController.verifyTwoFactor,
);
authRouter.post(
  '/2fa/disable',
  authenticate,
  validate(disableTwoFactorSchema),
  authController.disableTwoFactor,
);
