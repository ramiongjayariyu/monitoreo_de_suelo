import { prisma } from '@/config/db';
import { AppError } from '@/utils/appError';

export const historyVariables = ['humidity', 'ph', 'salinity', 'soilTemp', 'ambientTemp'] as const;

export type HistoryVariable = (typeof historyVariables)[number];
export type HistoryGranularity = 'hour' | 'day' | 'week';

interface HistoryRange {
  from?: string;
  to?: string;
}

function resolveRange(range: HistoryRange) {
  const to = range.to ? new Date(range.to) : new Date();
  const from = range.from ? new Date(range.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new AppError('El rango de fechas no es válido.', 400);
  }
  return { from, to };
}

function bucketStart(timestamp: Date, granularity: HistoryGranularity): number {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  if (granularity === 'hour') return date.getTime();
  date.setUTCHours(0);
  if (granularity === 'day') return date.getTime();
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.getTime();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function aggregateReadings(
  readings: Array<{ timestamp: Date; value: number }>,
  granularity: HistoryGranularity,
) {
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const reading of readings) {
    const timestamp = bucketStart(reading.timestamp, granularity);
    const bucket = buckets.get(timestamp) ?? { sum: 0, count: 0 };
    bucket.sum += reading.value;
    bucket.count += 1;
    buckets.set(timestamp, bucket);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, bucket]) => ({
      timestamp: new Date(timestamp).toISOString(),
      value: round(bucket.sum / bucket.count),
      count: bucket.count,
    }));
}

export function pearsonCorrelation(points: Array<{ x: number; y: number }>): number | null {
  if (points.length < 2) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (const point of points) {
    const deltaX = point.x - meanX;
    const deltaY = point.y - meanY;
    covariance += deltaX * deltaY;
    varianceX += deltaX ** 2;
    varianceY += deltaY ** 2;
  }
  if (varianceX === 0 || varianceY === 0) return null;
  return round(covariance / Math.sqrt(varianceX * varianceY));
}

export class HistoryService {
  async getSeries(
    nodeId: string,
    variable: HistoryVariable,
    range: HistoryRange,
    granularity: HistoryGranularity,
  ) {
    const { from, to } = resolveRange(range);
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, name: true },
    });
    if (!node) throw new AppError('El nodo solicitado no existe.', 404);
    const readings = await prisma.reading.findMany({
      where: { nodeId, timestamp: { gte: from, lte: to } },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: { timestamp: true, [variable]: true },
    });
    return {
      node,
      variable,
      granularity,
      range: { from: from.toISOString(), to: to.toISOString() },
      points: aggregateReadings(
        readings.map((reading) => ({
          timestamp: reading.timestamp,
          value: reading[variable],
        })),
        granularity,
      ),
    };
  }

  async compareNodes(
    nodeIds: string[],
    variable: HistoryVariable,
    range: HistoryRange,
    granularity: HistoryGranularity,
  ) {
    const { from, to } = resolveRange(range);
    const nodes = await prisma.node.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true, name: true },
    });
    if (nodes.length !== nodeIds.length) {
      throw new AppError('Uno o más nodos solicitados no existen.', 404);
    }
    const readings = await prisma.reading.findMany({
      where: { nodeId: { in: nodeIds }, timestamp: { gte: from, lte: to } },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: { nodeId: true, timestamp: true, [variable]: true },
    });
    return {
      variable,
      granularity,
      range: { from: from.toISOString(), to: to.toISOString() },
      series: nodes.map((node) => ({
        nodeId: node.id,
        nodeName: node.name,
        points: aggregateReadings(
          readings
            .filter((reading) => reading.nodeId === node.id)
            .map((reading) => ({
              timestamp: reading.timestamp,
              value: reading[variable],
            })),
          granularity,
        ),
      })),
    };
  }

  async getCorrelation(
    nodeId: string,
    varA: HistoryVariable,
    varB: HistoryVariable,
    range: HistoryRange,
  ) {
    const { from, to } = resolveRange(range);
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, name: true },
    });
    if (!node) throw new AppError('El nodo solicitado no existe.', 404);
    const readings = await prisma.reading.findMany({
      where: { nodeId, timestamp: { gte: from, lte: to } },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      select: {
        timestamp: true,
        humidity: true,
        ph: true,
        salinity: true,
        soilTemp: true,
        ambientTemp: true,
      },
    });
    const points = readings.map((reading) => ({
      timestamp: reading.timestamp.toISOString(),
      x: reading[varA],
      y: reading[varB],
    }));
    return {
      node,
      variables: { varA, varB },
      range: { from: from.toISOString(), to: to.toISOString() },
      coefficient: pearsonCorrelation(points),
      sampleCount: points.length,
      points,
    };
  }
}
