import { env } from './env';

export const corsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
};
