import { apiClient } from "./client";
import type { SoilVariable } from "@/types";

export interface SeverityThreshold {
  warning: number;
  critical: number;
}

export interface SystemConfig {
  severityThresholds: Record<SoilVariable, SeverityThreshold>;
  system: {
    defaultSamplingFrequency: number;
    units: Record<SoilVariable, string>;
    timeZone: string;
    language: "es";
  };
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: unknown;
  timestamp: string;
  user: { id: string; name: string; email: string } | null;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface AuditResponse {
  items: AuditLogRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const { data } = await apiClient.get<SystemConfig>("/config");
  return data;
}

export async function updateSystemConfig(
  input: Partial<SystemConfig>,
): Promise<SystemConfig> {
  const { data } = await apiClient.put<SystemConfig>("/config", input);
  return data;
}

export async function listAudit(filters: AuditFilters): Promise<AuditResponse> {
  const { data } = await apiClient.get<AuditResponse>("/audit", {
    params: filters,
  });
  return data;
}
