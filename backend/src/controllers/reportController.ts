import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ReportService, type ReportFormat, type ReportFilters } from '@/services/reportService';
import { AppError } from '@/utils/appError';

const reportService = new ReportService();
const idList = z
  .string()
  .optional()
  .transform((value) => (value ? value.split(',') : []))
  .pipe(z.array(z.cuid()).max(100));
const filtersSchema = z
  .object({
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
    nodeIds: idList,
    cropIds: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(',') : []))
      .pipe(z.array(z.cuid()).max(50)),
    sections: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(',') : ['summary', 'readings', 'alerts']))
      .pipe(z.array(z.enum(['summary', 'readings', 'alerts'])).min(1)),
  })
  .strict();
const exportSchema = z
  .object({ ...filtersSchema.shape, format: z.enum(['pdf', 'excel']) })
  .strict();
const shareSchema = exportSchema;

function actorId(userId: string | undefined): string {
  if (!userId) throw new AppError('Autenticación requerida.', 401);
  return userId;
}

function parseQuery<T extends z.ZodType>(schema: T, query: unknown): z.output<T> {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(
      `Filtros inválidos: ${parsed.error.issues.map((issue) => issue.message).join(' ')}`,
      400,
    );
  }
  return parsed.data;
}

function reportFilters(input: z.output<typeof filtersSchema>): ReportFilters {
  return {
    from: input.from,
    to: input.to,
    nodeIds: input.nodeIds,
    cropIds: input.cropIds,
    sections: {
      summary: input.sections.includes('summary'),
      readings: input.sections.includes('readings'),
      alerts: input.sections.includes('alerts'),
    },
  };
}

function sendFile(response: Parameters<RequestHandler>[1], format: ReportFormat, content: Buffer) {
  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  response.setHeader('Content-Type', contentType);
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="agrosense-reporte.${format === 'excel' ? 'xlsx' : 'pdf'}"`,
  );
  response.setHeader('Content-Length', content.length);
  response.send(content);
}

export const getReportPreview: RequestHandler = async (request, response) => {
  const input = parseQuery(filtersSchema, request.query);
  response.json(await reportService.getReport(reportFilters(input)));
};

export const exportReport: RequestHandler = async (request, response) => {
  const input = parseQuery(exportSchema, request.query);
  const { content } = await reportService.createExport(
    reportFilters(input),
    input.format,
    actorId(request.auth?.userId),
  );
  sendFile(response, input.format, content);
};

export const createReportShare: RequestHandler = async (request, response) => {
  const input = parseQuery(shareSchema, request.body);
  const share = await reportService.createShare(
    reportFilters(input),
    input.format,
    actorId(request.auth?.userId),
  );
  response.status(201).json(share);
};

export const downloadSharedReport: RequestHandler = async (request, response) => {
  const token = z
    .string()
    .regex(/^[\w-]{40,60}$/)
    .safeParse(request.params.token);
  if (!token.success) throw new AppError('El enlace no existe o expiró.', 404);
  const { content, format } = await reportService.getSharedExport(token.data);
  sendFile(response, format, content);
};

export const listReportHistory: RequestHandler = async (request, response) => {
  response.json({ reports: await reportService.listReports(actorId(request.auth?.userId)) });
};
