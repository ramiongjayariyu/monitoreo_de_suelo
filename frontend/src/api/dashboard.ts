import { apiClient } from "./client";
import type { Alert, SoilVariable } from "@/types";

export type DashboardPeriod = "24h" | "7d" | "30d";
export type DashboardStatus = "optimal" | "warning" | "critical" | "offline";

export interface DashboardFilters {
  nodeId?: string;
  cropId?: string;
  period: DashboardPeriod;
}

export interface DashboardSeriesPoint {
  timestamp: string;
  value: number;
}

export interface DashboardResponse {
  generatedAt: string;
  period: DashboardPeriod;
  filters: { nodeId: string | null; cropId: string | null };
  nodeCount: number;
  nodesWithReadings: number;
  kpis: Record<SoilVariable, { value: number | null; unit: string; data: number[] }>;
  series: Record<SoilVariable, DashboardSeriesPoint[]>;
  semaphore: {
    status: DashboardStatus;
    counts: Record<DashboardStatus, number>;
  };
  activeAlertCount: number;
  alerts: Alert[];
}

export async function getDashboard(
  filters: DashboardFilters,
): Promise<DashboardResponse> {
  const { data } = await apiClient.get<DashboardResponse>("/dashboard", {
    params: filters,
  });
  return data;
}
