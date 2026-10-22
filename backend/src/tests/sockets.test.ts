import { createServer } from 'node:http';
import { createSocketServer, emitToConnectedUsers } from '@/sockets';

describe('emisión de eventos Socket.IO', () => {
  it('envía los eventos de lecturas y alertas al servidor Socket.IO', async () => {
    const httpServer = createServer();
    const socketServer = createSocketServer(httpServer);
    const emit = jest.spyOn(socketServer, 'emit');

    emitToConnectedUsers('reading:new', { id: 'lectura-1' });
    emitToConnectedUsers('dashboard:update', { nodeId: 'nodo-1' });
    emitToConnectedUsers('node:status', { nodeId: 'nodo-1', status: 'ONLINE' });
    emitToConnectedUsers('alert:new', { id: 'alerta-1' });

    expect(emit).toHaveBeenNthCalledWith(1, 'reading:new', { id: 'lectura-1' });
    expect(emit).toHaveBeenNthCalledWith(2, 'dashboard:update', { nodeId: 'nodo-1' });
    expect(emit).toHaveBeenNthCalledWith(3, 'node:status', { nodeId: 'nodo-1', status: 'ONLINE' });
    expect(emit).toHaveBeenNthCalledWith(4, 'alert:new', { id: 'alerta-1' });
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
  });
});
