import type { RequestHandler } from 'express';
import { AuthService } from '@/services/authService';
import { AppError } from '@/utils/appError';

const authService = new AuthService();

function authenticatedUserId(userId: string | undefined): string {
  if (!userId) throw new AppError('Autenticación requerida.', 401);
  return userId;
}

export const login: RequestHandler = async (request, response) => {
  const session = await authService.login(request.body);
  response.json(session);
};

export const refresh: RequestHandler = async (request, response) => {
  const session = await authService.refresh(request.body.refreshToken);
  response.json(session);
};

export const logout: RequestHandler = async (request, response) => {
  await authService.logout(request.body.refreshToken);
  response.status(204).end();
};

export const forgotPassword: RequestHandler = async (request, response) => {
  await authService.requestPasswordReset(request.body.email);
  response.json({
    message:
      'Si el correo pertenece a una cuenta activa, recibirás instrucciones para restablecer la contraseña.',
  });
};

export const resetPassword: RequestHandler = async (request, response) => {
  await authService.resetPassword(request.body.token, request.body.newPassword);
  response.json({ message: 'La contraseña se actualizó correctamente.' });
};

export const getProfile: RequestHandler = async (request, response) => {
  response.json({ user: await authService.getProfile(authenticatedUserId(request.auth?.userId)) });
};

export const updateProfile: RequestHandler = async (request, response) => {
  response.json({
    user: await authService.updateProfile(authenticatedUserId(request.auth?.userId), request.body),
  });
};

export const changePassword: RequestHandler = async (request, response) => {
  await authService.changePassword(authenticatedUserId(request.auth?.userId), request.body);
  response.json({ message: 'La contraseña se actualizó. Inicia sesión nuevamente.' });
};

export const setupTwoFactor: RequestHandler = async (request, response) => {
  response.json(await authService.setupTwoFactor(authenticatedUserId(request.auth?.userId)));
};

export const verifyTwoFactor: RequestHandler = async (request, response) => {
  response.json(
    await authService.verifyTwoFactor(
      authenticatedUserId(request.auth?.userId),
      request.body.token,
    ),
  );
};

export const disableTwoFactor: RequestHandler = async (request, response) => {
  response.json(
    await authService.disableTwoFactor(authenticatedUserId(request.auth?.userId), request.body),
  );
};
