import { createServer } from 'node:http';
import { env } from './config/env';
import { prisma } from './config/db';
import { createSocketServer } from './sockets';
import { app } from './app';
const server = createServer(app);

createSocketServer(server);

server.listen(env.PORT, () => {
  console.info(`API AgroSense disponible en http://localhost:${env.PORT}/api`);
});

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
