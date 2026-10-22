import { Router } from 'express';
import { compareHistory, getCorrelation, getHistory } from '@/controllers/historyController';
import { authenticate } from '@/middlewares/authenticate';

export const historyRouter = Router();

historyRouter.use(authenticate);
historyRouter.get('/compare', compareHistory);
historyRouter.get('/correlation', getCorrelation);
historyRouter.get('/', getHistory);
