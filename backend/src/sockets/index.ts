import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { corsOptions } from '../config/cors';
import { jwtConfig } from '../config/jwt';

interface AuthenticatedSocket {
  userId: string;
}

let socketServer: Server | null = null;

export function createSocketServer(server: HttpServer): Server {
  const io = new Server(server, { cors: corsOptions });
  socketServer = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (typeof token !== 'string') {
      next(new Error('Autenticación requerida.'));
      return;
    }

    try {
      const payload = jwt.verify(token, jwtConfig.accessSecret);
      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        next(new Error('Token de acceso inválido.'));
        return;
      }

      (socket.data as AuthenticatedSocket).userId = payload.sub;
      next();
    } catch {
      next(new Error('Token de acceso inválido o vencido.'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data as AuthenticatedSocket;
    socket.join(`user:${userId}`);
  });

  return io;
}

export function emitToConnectedUsers(event: string, payload: unknown): void {
  socketServer?.emit(event, payload);
}
