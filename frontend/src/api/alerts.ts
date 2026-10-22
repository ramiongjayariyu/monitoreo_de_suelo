import { apiClient } from "./client";
import type { Alert, AlertSeverity, AlertStatus, SoilVariable } from "@/types";

export interface AlertFilters {
  nodeId?: string;
  severity?: AlertSeverity;
  variable?: SoilVariable;
  status?: AlertStatus;
  from?: string;
  to?: string;
  take?: number;
}

export interface AlertsResponse {
  alerts: Alert[];
  activeCount: number;
}

export async function listAlerts(filters: AlertFilters = {}): Promise<AlertsResponse> {
  const { data } = await apiClient.get<AlertsResponse>("/alerts", {
    params: filters,
  });
  return data;
}

export async function updateAlertStatus(
  id: string,
  action: "read" | "silence" | "close",
): Promise<Alert> {
  const { data } = await apiClient.patch<{ alert: Alert }>(`/alerts/${id}/${action}`);
  return data.alert;
}
