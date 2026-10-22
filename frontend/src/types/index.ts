export type UserRole = "ADMIN" | "OPERADOR" | "CONSULTA";
export type NodeStatus = "ONLINE" | "OFFLINE";
export type AlertSeverity = "INFO" | "ADVERTENCIA" | "CRITICA";
export type AlertStatus = "ACTIVA" | "LEIDA" | "SILENCIADA" | "CERRADA";
export type SoilVariable = "humidity" | "ph" | "salinity" | "soilTemp" | "ambientTemp";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

export interface MeasurementRange {
  min: number;
  max: number;
}

export type CropRanges = Record<SoilVariable, MeasurementRange>;

export interface Crop {
  id: string;
  name: string;
  description?: string | null;
  ranges: CropRanges;
  createdAt: string;
  _count?: { nodes: number; states: number };
}

export interface CropState {
  id: string;
  cropId: string;
  name: string;
  order: number;
  isActive: boolean;
  ranges: CropRanges;
}

export interface Node {
  id: string;
  deviceId: string;
  name: string;
  notes?: string | null;
  posX: number;
  posY: number;
  cropId?: string | null;
  stateId?: string | null;
  samplingFreq: number;
  status: NodeStatus;
  battery?: number | null;
  lastReading?: string | null;
}

export interface Reading {
  id: string;
  nodeId: string;
  humidity: number;
  ph: number;
  salinity: number;
  soilTemp: number;
  ambientTemp: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  nodeId: string;
  variable: SoilVariable;
  value: number;
  rangeMin: number;
  rangeMax: number;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: string;
  readAt?: string | null;
  closedAt?: string | null;
  node: { id: string; name: string; deviceId: string };
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  timestamp: string;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  updatedAt: string;
}
