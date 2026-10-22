import { Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { ConfigRepository } from '@/repositories/configRepository';
import { AppError } from '@/utils/appError';

export const configVariables = ['humidity', 'ph', 'salinity', 'soilTemp', 'ambientTemp'] as const;

export interface Threshold {
  warning: number;
  critical: number;
}

export type SeverityThresholds = Record<(typeof configVariables)[number], Threshold>;

export interface SystemSettings {
  defaultSamplingFrequency: number;
  units: Record<(typeof configVariables)[number], string>;
  timeZone: string;
  language: 'es';
}

const defaultThreshold: Threshold = { warning: 5, critical: 15 };
const defaultUnits: SystemSettings['units'] = {
  humidity: '%',
  ph: 'pH',
  salinity: 'dS/m',
  soilTemp: '°C',
  ambientTemp: '°C',
};

export const defaultSeverityThresholds: SeverityThresholds = Object.fromEntries(
  configVariables.map((variable) => [variable, defaultThreshold]),
) as SeverityThresholds;

export const defaultSystemSettings: SystemSettings = {
  defaultSamplingFrequency: 300,
  units: defaultUnits,
  timeZone: 'America/Mexico_City',
  language: 'es',
};

export class ConfigService {
  constructor(private readonly configs = new ConfigRepository()) {}

  async get() {
    const records = await this.configs.list();
    const values = new Map(records.map((record) => [record.key, record.value]));
    return {
      severityThresholds: parseSeverityThresholds(
        values.get('alertSeverityThresholds') ?? defaultSeverityThresholds,
      ),
      system: parseSystemSettings(values.get('systemSettings') ?? defaultSystemSettings),
    };
  }

  async update(
    input: { severityThresholds?: SeverityThresholds; system?: SystemSettings },
    actorId: string,
  ) {
    const current = await this.get();
    const next = {
      severityThresholds: input.severityThresholds ?? current.severityThresholds,
      system: input.system ?? current.system,
    };
    await prisma.$transaction(async (transaction) => {
      const repository = new ConfigRepository(transaction);
      if (input.severityThresholds) {
        await repository.upsert(
          'alertSeverityThresholds',
          input.severityThresholds as unknown as Prisma.InputJsonValue,
        );
      }
      if (input.system) {
        await repository.upsert('systemSettings', input.system as unknown as Prisma.InputJsonValue);
      }
      await transaction.auditLog.create({
        data: {
          userId: actorId,
          action: 'SYSTEM_CONFIG_UPDATED',
          entity: 'SystemConfig',
          changes: JSON.parse(
            JSON.stringify({
              before: current,
              after: next,
            }),
          ) as Prisma.InputJsonValue,
        },
      });
    });
    return next;
  }
}

export function parseSeverityThresholds(value: unknown): SeverityThresholds {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('La configuración de umbrales no tiene un formato válido.', 500);
  }
  const source = value as Record<string, unknown>;
  const legacy =
    typeof source.warning === 'number' && typeof source.critical === 'number'
      ? { warning: source.warning, critical: source.critical }
      : null;
  const result = {} as SeverityThresholds;
  for (const variable of configVariables) {
    const configured = source[variable] ?? legacy ?? defaultThreshold;
    if (
      !configured ||
      typeof configured !== 'object' ||
      !('warning' in configured) ||
      !('critical' in configured) ||
      typeof configured.warning !== 'number' ||
      typeof configured.critical !== 'number' ||
      !Number.isFinite(configured.warning) ||
      !Number.isFinite(configured.critical) ||
      configured.warning < 0 ||
      configured.critical <= configured.warning ||
      configured.critical > 1000
    ) {
      throw new AppError(`Los umbrales de ${variable} no son válidos.`, 500);
    }
    result[variable] = {
      warning: configured.warning,
      critical: configured.critical,
    };
  }
  return result;
}

function parseSystemSettings(value: unknown): SystemSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('La configuración del sistema no tiene un formato válido.', 500);
  }
  const source = value as Record<string, unknown>;
  const frequency =
    source.defaultSamplingFrequency ?? defaultSystemSettings.defaultSamplingFrequency;
  const timeZone = source.timeZone ?? defaultSystemSettings.timeZone;
  const language = source.language ?? 'es';
  const unitsSource = source.units ?? defaultUnits;
  if (
    typeof frequency !== 'number' ||
    !Number.isInteger(frequency) ||
    frequency < 5 ||
    frequency > 86400
  ) {
    throw new AppError('La frecuencia predeterminada debe estar entre 5 y 86.400 segundos.', 500);
  }
  if (typeof timeZone !== 'string' || !isValidTimeZone(timeZone)) {
    throw new AppError('La zona horaria configurada no es válida.', 500);
  }
  if (language !== 'es') {
    throw new AppError('El idioma configurado no es compatible.', 500);
  }
  if (!unitsSource || typeof unitsSource !== 'object' || Array.isArray(unitsSource)) {
    throw new AppError('Las unidades configuradas no son válidas.', 500);
  }
  const units = {} as SystemSettings['units'];
  for (const variable of configVariables) {
    const unit = (unitsSource as Record<string, unknown>)[variable];
    if (typeof unit !== 'string' || !unit.trim() || unit.length > 20) {
      throw new AppError(`La unidad de ${variable} no es válida.`, 500);
    }
    units[variable] = unit.trim();
  }
  return {
    defaultSamplingFrequency: frequency,
    units,
    timeZone,
    language,
  };
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('es', { timeZone });
    return true;
  } catch {
    return false;
  }
}
