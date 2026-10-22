import type { ErrorRequestHandler } from 'express';
import { AppError } from '@/utils/appError';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    status: 'error',
    message: 'Ocurrió un error interno al procesar la solicitud.',
  });
};
