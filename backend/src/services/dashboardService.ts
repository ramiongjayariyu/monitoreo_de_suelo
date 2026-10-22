import { AlertSeverity, AlertStatus, NodeStatus } from '@prisma/client';
import { prisma } from '@/config/db';
import { AppError } from '@/utils/appError';
import { ConfigService } from '@/services/configService';

export const dashboardVariables = [
  'humidity',
  'ph',
  'salinity',
  'soilTemp',
  'ambientTemp',
] as const;

export type DashboardVariable = (typeof dashboardVariables)[number];
export type DashboardPeriod = '24h' | '7d' | '30d';
export type SemaphoreStatus = 'optimal' | 'warning' | 'critical' | 'offline';

const periodDuration: Record<DashboardPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const bucketDuration: Record<DashboardPeriod, number> = {
  '24h': 5 * 60 * 1000,
  '7d': 30 * 60 * 1000,
  '30d': 2 * 60 * 60 * 1000,
};

interface DashboardFilters {
  nodeId?: string;
  cropId?: string;
  period: DashboardPeriod;
}

type LatestReading = {
  humidity: number;
  ph: number;
  salinity: number;
  soilTemp: number;
  ambientTemp: number;
  timestamp: Date;
};

export class DashboardService {
  async getDashboard(filters: DashboardFilters) {
    const systemSettings = (await new ConfigService().get()).system;
    const to = new Date();
    const from = new Date(to.getTime() - periodDuration[filters.period]);
    const nodes = await prisma.node.findMany({
      where: {
        ...(filters.nodeId ? { id: filters.nodeId } : {}),
        ...(filters.cropId ? { cropId: filters.cropId } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        readings: {
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            humidity: true,
            ph: true,
            salinity: true,
            soilTemp: true,
            ambientTemp: true,
            timestamp: true,
          },
        },
        alerts: {
          where: { status: { not: AlertStatus.CERRADA } },
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { severity: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const nodeIds = nodes.map(({ id }) => id);

    const [readings, alerts, activeAlertCount] = nodeIds.length
      ? await Promise.all([
          prisma.reading.findMany({
            where: { nodeId: { in: nodeIds }, timestamp: { gte: from, lte: to } },
            orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
            take: 10_000,
            select: {
              humidity: true,
              ph: true,
              salinity: true,
              soilTemp: true,
              ambientTemp: true,
              timestamp: true,
            },
          }),
          prisma.alert.findMany({
            where: {
              nodeId: { in: nodeIds },
              status: { in: [AlertStatus.ACTIVA, AlertStatus.LEIDA] },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { node: { select: { id: true, name: true, deviceId: true } } },
          }),
          prisma.alert.count({
            where: { nodeId: { in: nodeIds }, status: AlertStatus.ACTIVA },
          }),
        ])
      : [[], [], 0];

    const latestReadings = nodes
      .map((node) => node.readings[0])
      .filter((reading): reading is LatestReading => reading !== undefined);
    const semaphoreCounts = { optimal: 0, warning: 0, critical: 0, offline: 0 };

    for (const node of nodes) {
      if (node.status === NodeStatus.OFFLINE || !node.readings[0]) {
        semaphoreCounts.offline += 1;
        continue;
      }
      const severity = node.alerts[0]?.severity;
      if (severity === AlertSeverity.CRITICA) semaphoreCounts.critical += 1;
      else if (severity === AlertSeverity.ADVERTENCIA) semaphoreCounts.warning += 1;
      else semaphoreCounts.optimal += 1;
    }

    const series = buildSeries(readings, filters.period);
    const kpis = Object.fromEntries(
      dashboardVariables.map((variable) => {
        const values = latestReadings.map((reading) => reading[variable]);
        const value = values.length
          ? round(values.reduce((sum, item) => sum + item, 0) / values.length)
          : null;
        return [
          variable,
          {
            value,
            unit: systemSettings.units[variable],
            data: series[variable].slice(-12).map(({ value: point }) => point),
          },
        ];
      }),
    ) as Record<DashboardVariable, { value: number | null; unit: string; data: number[] }>;

    return {
      generatedAt: to.toISOString(),
      period: filters.period,
      filters: { nodeId: filters.nodeId ?? null, cropId: filters.cropId ?? null },
      nodeCount: nodes.length,
      nodesWithReadings: latestReadings.length,
      kpis,
      series,
      semaphore: {
        status: getOverallStatus(semaphoreCounts),
        counts: semaphoreCounts,
      },
      activeAlertCount,
      alerts,
    };
  }
}

function buildSeries(
  readings: Array<{
    timestamp: Date;
    humidity: number;
    ph: number;
    salinity: number;
    soilTemp: number;
    ambientTemp: number;
  }>,
  period: DashboardPeriod,
) {
  const buckets = new Map<number, Record<DashboardVariable, { sum: number; count: number }>>();
  const interval = bucketDuration[period];

  for (const reading of readings) {
    const bucket = Math.floor(reading.timestamp.getTime() / interval) * interval;
    let values = buckets.get(bucket);
    if (!values) {
      values = Object.fromEntries(
        dashboardVariables.map((variable) => [variable, { sum: 0, count: 0 }]),
      ) as Record<DashboardVariable, { sum: number; count: number }>;
      buckets.set(bucket, values);
    }
    for (const variable of dashboardVariables) {
      values[variable].sum += reading[variable];
      values[variable].count += 1;
    }
  }

  return Object.fromEntries(
    dashboardVariables.map((variable) => [
      variable,
      [...buckets.entries()]
        .sort(([left], [right]) => left - right)
        .map(([timestamp, values]) => ({
          timestamp: new Date(timestamp).toISOString(),
          value: round(values[variable].sum / values[variable].count),
        })),
    ]),
  ) as Record<DashboardVariable, Array<{ timestamp: string; value: number }>>;
}

function getOverallStatus(counts: Record<SemaphoreStatus, number>): SemaphoreStatus {
  if (counts.critical > 0) return 'critical';
  if (counts.warning > 0) return 'warning';
  if (counts.optimal > 0) return 'optimal';
  return 'offline';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseDashboardFilters(input: {
  nodeId?: string;
  cropId?: string;
  period?: string;
}): DashboardFilters {
  const period = input.period ?? '24h';
  if (period !== '24h' && period !== '7d' && period !== '30d') {
    throw new AppError('El periodo debe ser 24h, 7d o 30d.', 400);
  }
  return {
    ...(input.nodeId ? { nodeId: input.nodeId } : {}),
    ...(input.cropId ? { cropId: input.cropId } : {}),
    period,
  };
}
