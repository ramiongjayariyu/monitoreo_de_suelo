import type { RequestHandler } from 'express';
import { UserService } from '@/services/userService';
import { AppError } from '@/utils/appError';

const userService = new UserService();

function actorId(userId: string | undefined): string {
  if (!userId) throw new AppError('Autenticación requerida.', 401);
  return userId;
}

function routeId(id: string | string[] | undefined): string {
  if (typeof id !== 'string') throw new AppError('El identificador del usuario no es válido.', 400);
  return id;
}

export const listUsers: RequestHandler = async (_request, response) => {
  response.json({ users: await userService.list() });
};

export const createUser: RequestHandler = async (request, response) => {
  const user = await userService.create(request.body);
  response.status(201).json({ user });
};

export const updateUser: RequestHandler = async (request, response) => {
  const user = await userService.update(
    routeId(request.params.id),
    request.body,
    actorId(request.auth?.userId),
  );
  response.json({ user });
};

export const deactivateUser: RequestHandler = async (request, response) => {
  await userService.deactivate(routeId(request.params.id), actorId(request.auth?.userId));
  response.status(204).end();
};
