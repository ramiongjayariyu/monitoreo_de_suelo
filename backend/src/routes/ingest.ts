import { Router } from 'express';
import { z } from 'zod';
import { authenticateIngest, ingestReading } from '@/controllers/ingestController';
import { validate } from '@/middlewares/validate';

const readingSchema = z
  .object({
    deviceId: z.string().trim().min(1).max(100),
    humidity: z.number().finite(),
    ph: z.number().finite(),
    salinity: z.number().finite(),
    soilTemp: z.number().finite(),
    ambientTemp: z.number().finite(),
    timestamp: z.coerce
      .date()
      .optional()
      .default(() => new Date()),
    battery: z.number().finite().min(0).max(100).optional(),
  })
  .strict();

export const ingestRouter = Router();
ingestRouter.post('/', authenticateIngest, validate(readingSchema), ingestReading);
