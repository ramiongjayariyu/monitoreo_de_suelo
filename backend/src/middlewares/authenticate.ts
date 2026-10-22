import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { jwtConfig } from '@/config/jwt';
import { prisma } from '@/config/db';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthenticatedUser;
  }
}

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!token) {
    response.status(401).json({ status: 'error', message: 'Autenticación requerida.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtConfig.accessSecret);
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      payload.type !== 'access'
    ) {
      response.status(401).json({ status: 'error', message: 'Token de acceso inválido.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, active: true },
    });
    if (!user?.active) {
      response.status(401).json({ status: 'error', message: 'La sesión no está activa.' });
      return;
    }

    request.auth = { userId: user.id, role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      response
        .status(401)
        .json({ status: 'error', message: 'Token de acceso inválido o vencido.' });
      return;
    }
    next(error);
  }
};

export function authorize(...roles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.auth) {
      response.status(401).json({ status: 'error', message: 'Autenticación requerida.' });
      return;
    }
    if (!roles.includes(request.auth.role)) {
      response
        .status(403)
        .json({ status: 'error', message: 'No tienes permiso para esta acción.' });
      return;
    }
    next();
  };
}
