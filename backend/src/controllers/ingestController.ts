import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { env } from '@/config/env';
import { AlertEngineService } from '@/services/alertEngineService';
import { emitToConnectedUsers } from '@/sockets';

const ingestService = new AlertEngineService();

export const authenticateIngest: RequestHandler = (request, response, next) => {
  const suppliedKey = request.header('x-api-key') ?? '';
  const expected = Buffer.from(env.INGEST_API_KEY);
  const supplied = Buffer.from(suppliedKey);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    response.status(401).json({ status: 'error', message: 'Clave de ingesta inválida.' });
    return;
  }
  next();
};

export const ingestReading: RequestHandler = async (request, response) => {
  const result = await ingestService.ingest(
    request.body.deviceId,
    {
      humidity: request.body.humidity,
      ph: request.body.ph,
      salinity: request.body.salinity,
      soilTemp: request.body.soilTemp,
      ambientTemp: request.body.ambientTemp,
    },
    request.body.timestamp,
    request.body.battery,
  );
  emitToConnectedUsers('reading:new', result.reading);
  emitToConnectedUsers('dashboard:update', { nodeId: result.reading.nodeId });
  if (result.nodeStatusChanged) {
    emitToConnectedUsers('node:status', { nodeId: result.reading.nodeId, status: 'ONLINE' });
  }
  for (const alert of result.alerts) emitToConnectedUsers('alert:new', alert);
  response.status(201).json(result);
};
