import { AlertSeverity, AlertStatus } from '@prisma/client';
import { prisma } from '@/config/db';
import { AlertRepository } from '@/repositories/alertRepository';
import { ReadingRepository } from '@/repositories/readingRepository';
import { configVariables, parseSeverityThresholds } from '@/services/configService';
import { AppError } from '@/utils/appError';

export const soilVariables = configVariables;
export type SoilVariable = (typeof soilVariables)[number];

const variableLabels: Record<SoilVariable, string> = {
  humidity: 'Humedad',
  ph: 'pH',
  salinity: 'Salinidad',
  soilTemp: 'Temperatura del suelo',
  ambientTemp: 'Temperatura ambiente',
};

export interface ReadingValues {
  humidity: number;
  ph: number;
  salinity: number;
  soilTemp: number;
  ambientTemp: number;
}

interface MeasurementRange {
  min: number;
  max: number;
}

interface SeverityThresholds {
  warning: number;
  critical: number;
}

export class AlertEngineService {
  constructor(
    private readonly readings = new ReadingRepository(),
    private readonly alerts = new AlertRepository(),
  ) {}

  async ingest(deviceId: string, values: ReadingValues, timestamp = new Date(), battery?: number) {
    const node = await prisma.node.findUnique({
      where: { deviceId },
      include: { state: true },
    });
    if (!node) throw new AppError('No existe un nodo con ese identificador de dispositivo.', 404);

    const reading = await prisma.$transaction(async (transaction) => {
      const saved = await new ReadingRepository(transaction).create({
        nodeId: node.id,
        ...values,
        timestamp,
      });
      if (battery === undefined) {
        await transaction.$executeRaw`
          UPDATE "Node"
          SET "status" = CAST('ONLINE' AS "NodeStatus"),
              "lastReading" = GREATEST(COALESCE("lastReading", ${timestamp}), ${timestamp})
          WHERE "id" = ${node.id}
        `;
      } else {
        await transaction.$executeRaw`
          UPDATE "Node"
          SET "status" = CAST('ONLINE' AS "NodeStatus"),
              "lastReading" = GREATEST(COALESCE("lastReading", ${timestamp}), ${timestamp}),
              "battery" = ${battery}
          WHERE "id" = ${node.id}
        `;
      }
      return saved;
    });

    const createdAlerts =
      node.cropId && node.stateId && node.state?.isActive && node.state.cropId === node.cropId
        ? await this.evaluate(node.id, node.state.ranges, values)
        : [];

    return {
      reading,
      alerts: createdAlerts,
      nodeStatusChanged: node.status !== 'ONLINE',
    };
  }

  private async evaluate(nodeId: string, rangesJson: unknown, values: ReadingValues) {
    const ranges = parseRanges(rangesJson);
    const thresholds = await getThresholds();
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Node" WHERE "id" = ${nodeId} FOR UPDATE`;
      const repository = new AlertRepository(transaction);
      const created = [];

      for (const variable of soilVariables) {
        const value = values[variable];
        const range = ranges[variable];
        if (value >= range.min && value <= range.max) continue;

        const existing = await repository.findOpenByNodeVariable(nodeId, variable);
        if (existing) continue;

        const span = range.max - range.min;
        const distance = value < range.min ? range.min - value : value - range.max;
        const deviationPercent = (distance / span) * 100;
        const variableThresholds = thresholds[variable];
        const severity =
          deviationPercent >= variableThresholds.critical
            ? AlertSeverity.CRITICA
            : deviationPercent >= variableThresholds.warning
              ? AlertSeverity.ADVERTENCIA
              : AlertSeverity.INFO;
        const alert = await repository.create({
          nodeId,
          variable,
          value,
          rangeMin: range.min,
          rangeMax: range.max,
          severity,
          status: AlertStatus.ACTIVA,
          message: `${variableLabels[variable]} fuera del rango óptimo (${range.min}–${range.max}); valor registrado: ${value}.`,
        });
        created.push(alert);
      }

      return created;
    });
  }
}

function parseRanges(value: unknown): Record<SoilVariable, MeasurementRange> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('Los rangos del estado vigente no tienen un formato válido.', 500);
  }
  const record = value as Record<string, unknown>;
  const parsed = {} as Record<SoilVariable, MeasurementRange>;
  for (const variable of soilVariables) {
    const range = record[variable];
    if (
      !range ||
      typeof range !== 'object' ||
      !('min' in range) ||
      !('max' in range) ||
      typeof range.min !== 'number' ||
      typeof range.max !== 'number' ||
      !Number.isFinite(range.min) ||
      !Number.isFinite(range.max) ||
      range.min >= range.max
    ) {
      throw new AppError(
        `El rango de ${variableLabels[variable]} no tiene un formato válido.`,
        500,
      );
    }
    parsed[variable] = { min: range.min, max: range.max };
  }
  return parsed;
}

async function getThresholds(): Promise<Record<SoilVariable, SeverityThresholds>> {
  const configured = await prisma.systemConfig.findUnique({
    where: { key: 'alertSeverityThresholds' },
  });
  try {
    return parseSeverityThresholds(configured?.value ?? { warning: 5, critical: 15 });
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError('La configuración de severidad de alertas no es válida.', 500);
    }
    throw error;
  }
}
