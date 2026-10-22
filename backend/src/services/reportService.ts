import { createHash, randomBytes } from 'node:crypto';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AlertSeverity, Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { AppError } from '@/utils/appError';

export const reportVariables = ['humidity', 'ph', 'salinity', 'soilTemp', 'ambientTemp'] as const;

export type ReportVariable = (typeof reportVariables)[number];
export type ReportFormat = 'pdf' | 'excel';
export interface ReportFilters {
  from: string;
  to: string;
  nodeIds: string[];
  cropIds: string[];
  sections: { summary: boolean; readings: boolean; alerts: boolean };
}

const variableLabels: Record<ReportVariable, string> = {
  humidity: 'Humedad (%)',
  ph: 'pH',
  salinity: 'Salinidad (dS/m)',
  soilTemp: 'Temperatura del suelo (°C)',
  ambientTemp: 'Temperatura ambiente (°C)',
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class ReportService {
  async getReport(filters: ReportFilters) {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to ||
      to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000
    ) {
      throw new AppError('El rango debe ser válido y no superar 366 días.', 400);
    }
    const nodeWhere: Prisma.NodeWhereInput = {
      ...(filters.nodeIds.length ? { id: { in: filters.nodeIds } } : {}),
      ...(filters.cropIds.length ? { cropId: { in: filters.cropIds } } : {}),
    };
    const nodes = await prisma.node.findMany({
      where: nodeWhere,
      select: { id: true, name: true, deviceId: true, crop: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    const nodeIds = nodes.map((node) => node.id);
    const [readings, alerts] = nodeIds.length
      ? await Promise.all([
          filters.sections.readings || filters.sections.summary
            ? prisma.reading.findMany({
                where: { nodeId: { in: nodeIds }, timestamp: { gte: from, lte: to } },
                orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
                take: 10_001,
                select: {
                  nodeId: true,
                  timestamp: true,
                  humidity: true,
                  ph: true,
                  salinity: true,
                  soilTemp: true,
                  ambientTemp: true,
                },
              })
            : Promise.resolve([]),
          filters.sections.alerts
            ? prisma.alert.findMany({
                where: { nodeId: { in: nodeIds }, createdAt: { gte: from, lte: to } },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: 10_001,
                select: {
                  createdAt: true,
                  nodeId: true,
                  variable: true,
                  value: true,
                  rangeMin: true,
                  rangeMax: true,
                  severity: true,
                  status: true,
                  message: true,
                },
              })
            : Promise.resolve([]),
        ])
      : [[], []];

    if (readings.length > 10_000 || alerts.length > 10_000) {
      throw new AppError('El reporte excede el límite de 10.000 filas por sección.', 413);
    }

    const averages = Object.fromEntries(
      reportVariables.map((variable) => {
        const values = readings.map((reading) => reading[variable]);
        return [
          variable,
          values.length
            ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) /
              100
            : null,
        ];
      }),
    ) as Record<ReportVariable, number | null>;
    const severityCounts: Record<AlertSeverity, number> = {
      INFO: 0,
      ADVERTENCIA: 0,
      CRITICA: 0,
    };
    for (const alert of alerts) severityCounts[alert.severity] += 1;

    const daily = new Map<string, { sum: number; count: number }>();
    for (const reading of readings) {
      const date = reading.timestamp.toISOString().slice(0, 10);
      const bucket = daily.get(date) ?? { sum: 0, count: 0 };
      bucket.sum += reading.humidity;
      bucket.count += 1;
      daily.set(date, bucket);
    }

    return {
      generatedAt: new Date().toISOString(),
      range: { from: from.toISOString(), to: to.toISOString() },
      filters,
      nodes,
      summary: {
        nodeCount: nodes.length,
        readingCount: readings.length,
        alertCount: alerts.length,
        severityCounts,
        averages,
      },
      chart: [...daily.entries()].map(([date, values]) => ({
        date,
        humidity: Math.round((values.sum / values.count) * 100) / 100,
      })),
      readings,
      alerts,
    };
  }

  async createExport(filters: ReportFilters, format: ReportFormat, userId: string) {
    const report = await this.getReport(filters);
    const content = format === 'pdf' ? await this.toPdf(report) : await this.toExcel(report);
    const record = await prisma.reportRecord.create({
      data: {
        userId,
        format,
        filters: filters as unknown as Prisma.InputJsonValue,
      },
    });
    return { report, content, record };
  }

  async createShare(filters: ReportFilters, format: ReportFormat, userId: string) {
    const report = await this.getReport(filters);
    const record = await prisma.reportRecord.create({
      data: {
        userId,
        format,
        filters: filters as unknown as Prisma.InputJsonValue,
      },
    });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const share = await prisma.reportShare.create({
      data: { reportId: record.id, tokenHash: hashToken(token), expiresAt },
      select: { expiresAt: true },
    });
    return { token, expiresAt: share.expiresAt, format, generatedAt: report.generatedAt };
  }

  async getSharedExport(token: string) {
    const share = await prisma.reportShare.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { report: true },
    });
    if (!share || share.expiresAt <= new Date()) {
      throw new AppError('El enlace no existe o expiró.', 404);
    }
    const filters = share.report.filters as unknown as ReportFilters;
    const report = await this.getReport(filters);
    const format = share.report.format as ReportFormat;
    if (format !== 'pdf' && format !== 'excel') {
      throw new AppError('El formato del reporte compartido no es válido.', 500);
    }
    return {
      content: format === 'pdf' ? await this.toPdf(report) : await this.toExcel(report),
      format,
    };
  }

  async listReports(userId: string) {
    return prisma.reportRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        format: true,
        filters: true,
        createdAt: true,
        shares: {
          where: { expiresAt: { gt: new Date() } },
          select: { expiresAt: true },
          take: 1,
        },
      },
    });
  }

  private async toExcel(report: Awaited<ReturnType<ReportService['getReport']>>) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgroSense';
    workbook.created = new Date(report.generatedAt);

    if (report.filters.sections.summary) {
      const sheet = workbook.addWorksheet('Resumen');
      sheet.columns = [
        { header: 'Indicador', key: 'label', width: 36 },
        { header: 'Valor', key: 'value', width: 20 },
      ];
      sheet.addRows([
        { label: 'Generado', value: report.generatedAt },
        { label: 'Desde', value: report.range.from },
        { label: 'Hasta', value: report.range.to },
        { label: 'Nodos', value: report.summary.nodeCount },
        { label: 'Lecturas', value: report.summary.readingCount },
        { label: 'Alertas', value: report.summary.alertCount },
        ...reportVariables.map((variable) => ({
          label: variableLabels[variable],
          value: report.summary.averages[variable] ?? 'Sin datos',
        })),
        ...Object.entries(report.summary.severityCounts).map(([severity, count]) => ({
          label: `Alertas ${severity}`,
          value: count,
        })),
      ]);
      styleHeader(sheet);
    }

    if (report.filters.sections.readings) {
      const sheet = workbook.addWorksheet('Lecturas');
      sheet.columns = [
        { header: 'Nodo', key: 'node', width: 28 },
        { header: 'Fecha', key: 'timestamp', width: 26 },
        ...reportVariables.map((variable) => ({
          header: variableLabels[variable],
          key: variable,
          width: 24,
        })),
      ];
      const nodeNames = new Map(report.nodes.map((node) => [node.id, node.name]));
      for (const reading of report.readings) {
        sheet.addRow({ node: nodeNames.get(reading.nodeId), ...reading });
      }
      styleHeader(sheet);
    }

    if (report.filters.sections.alerts) {
      const sheet = workbook.addWorksheet('Alertas');
      sheet.columns = [
        { header: 'Fecha', key: 'createdAt', width: 26 },
        { header: 'Nodo', key: 'node', width: 28 },
        { header: 'Variable', key: 'variable', width: 20 },
        { header: 'Valor', key: 'value', width: 14 },
        { header: 'Rango mínimo', key: 'rangeMin', width: 16 },
        { header: 'Rango máximo', key: 'rangeMax', width: 16 },
        { header: 'Severidad', key: 'severity', width: 18 },
        { header: 'Estado', key: 'status', width: 18 },
        { header: 'Mensaje', key: 'message', width: 52 },
      ];
      const nodeNames = new Map(report.nodes.map((node) => [node.id, node.name]));
      for (const alert of report.alerts) {
        sheet.addRow({ ...alert, node: nodeNames.get(alert.nodeId) });
      }
      styleHeader(sheet);
    }

    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data);
  }

  private async toPdf(report: Awaited<ReturnType<ReportService['getReport']>>) {
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      const pageBottom = () => document.page.height - document.page.margins.bottom;
      const ensureSpace = (height: number) => {
        if (document.y + height > pageBottom()) document.addPage();
      };
      const row = (values: string[], widths: number[], header = false) => {
        const height = 22;
        ensureSpace(height);
        const startX = document.page.margins.left;
        const rowY = document.y;
        let x = startX;
        values.forEach((value, index) => {
          const width = widths[index];
          if (header) {
            document.rect(x, rowY, width, height).fill('#1B4332');
            document.fillColor('white');
          } else {
            document.rect(x, rowY, width, height).fill(index % 2 ? '#F4F7F4' : 'white');
            document.fillColor('#24352B');
          }
          document.fontSize(7).text(value, x + 4, rowY + 6, {
            width: width - 8,
            height: height - 8,
            ellipsis: true,
          });
          x += width;
        });
        document.y = rowY + height;
      };

      document.fontSize(26).fillColor('#1B4332').text('AgroSense', { align: 'center' });
      document.moveDown(0.3);
      document
        .fontSize(18)
        .fillColor('#24352B')
        .text('Reporte de monitoreo del suelo', { align: 'center' });
      document.moveDown(0.5);
      document
        .fontSize(10)
        .fillColor('#5A6B62')
        .text(`Periodo: ${formatDate(report.range.from)} — ${formatDate(report.range.to)}`, {
          align: 'center',
        });
      document.text(`Generado: ${formatDate(report.generatedAt)}`, { align: 'center' });
      document.moveDown(1.5);

      if (report.filters.sections.summary) {
        document.fontSize(15).fillColor('#1B4332').text('Resumen ejecutivo');
        document.moveDown(0.4);
        document.fontSize(10).fillColor('#24352B');
        document.text(`Nodos incluidos: ${report.summary.nodeCount}`);
        document.text(`Lecturas: ${report.summary.readingCount}`);
        document.text(`Alertas: ${report.summary.alertCount}`);
        document.text(
          `Severidad — Críticas: ${report.summary.severityCounts.CRITICA}, Advertencias: ${report.summary.severityCounts.ADVERTENCIA}, Información: ${report.summary.severityCounts.INFO}`,
        );
        document.moveDown(0.5);
        for (const variable of reportVariables) {
          document.text(
            `${variableLabels[variable]} promedio: ${report.summary.averages[variable] ?? 'Sin datos'}`,
          );
        }
        if (report.chart.length) {
          document.moveDown(0.8);
          document.fontSize(12).fillColor('#1B4332').text('Tendencia diaria de humedad');
          drawHumidityChart(document, report.chart);
          document.moveDown(0.6);
        }
      }

      if (report.filters.sections.readings) {
        ensureSpace(50);
        document.fontSize(15).fillColor('#1B4332').text('Lecturas');
        document.moveDown(0.4);
        const widths = [78, 76, 48, 42, 52, 58, 58, 52];
        row(
          ['Nodo', 'Fecha', 'Humedad', 'pH', 'Salinidad', 'Temp. suelo', 'Temp. amb.', ''],
          widths,
          true,
        );
        const nodeNames = new Map(report.nodes.map((node) => [node.id, node.name]));
        for (const reading of report.readings) {
          row(
            [
              nodeNames.get(reading.nodeId) ?? 'Nodo',
              formatDate(reading.timestamp.toISOString()),
              reading.humidity.toFixed(1),
              reading.ph.toFixed(2),
              reading.salinity.toFixed(2),
              reading.soilTemp.toFixed(1),
              reading.ambientTemp.toFixed(1),
              '',
            ],
            widths,
          );
        }
        document.moveDown(0.5);
      }

      if (report.filters.sections.alerts) {
        ensureSpace(50);
        document.fontSize(15).fillColor('#1B4332').text('Alertas');
        document.moveDown(0.4);
        const widths = [82, 70, 58, 66, 70, 134];
        row(['Fecha', 'Nodo', 'Variable', 'Severidad', 'Estado', 'Detalle'], widths, true);
        const nodeNames = new Map(report.nodes.map((node) => [node.id, node.name]));
        for (const alert of report.alerts) {
          row(
            [
              formatDate(alert.createdAt.toISOString()),
              nodeNames.get(alert.nodeId) ?? 'Nodo',
              alert.variable,
              alert.severity,
              alert.status,
              alert.message,
            ],
            widths,
          );
        }
      }

      const range = document.bufferedPageRange();
      for (let index = 0; index < range.count; index += 1) {
        document.switchToPage(range.start + index);
        document
          .fontSize(8)
          .fillColor('#5E6B63')
          .text(
            `AgroSense · Página ${index + 1} de ${range.count}`,
            document.page.margins.left,
            document.page.height - 28,
            {
              align: 'center',
              width: document.page.width - document.page.margins.left - document.page.margins.right,
            },
          );
      }
      document.end();
    });
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
  header.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + sheet.columnCount)}1` };
}

function drawHumidityChart(
  document: PDFKit.PDFDocument,
  points: Array<{ date: string; humidity: number }>,
) {
  const x = document.page.margins.left;
  const y = document.y;
  const width = document.page.width - document.page.margins.left - document.page.margins.right;
  const height = 100;
  const values = points.map((point) => point.humidity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  document.save();
  document.rect(x, y, width, height).fill('#F4F7F4');
  document.strokeColor('#DCE5DF').lineWidth(0.5);
  for (let index = 0; index < 4; index += 1) {
    const gridY = y + 12 + (height - 24) * (index / 3);
    document
      .moveTo(x + 28, gridY)
      .lineTo(x + width - 8, gridY)
      .stroke();
  }
  if (points.length > 1) {
    document.strokeColor('#20786E').lineWidth(2);
    const plotWidth = width - 40;
    points.forEach((point, index) => {
      const pointX = x + 32 + (plotWidth * index) / (points.length - 1);
      const pointY = y + height - 12 - ((point.humidity - min) / spread) * (height - 24);
      if (index === 0) document.moveTo(pointX, pointY);
      else document.lineTo(pointX, pointY);
    });
    document.stroke();
  }
  document.restore();
  document.y = y + height + 12;
}
