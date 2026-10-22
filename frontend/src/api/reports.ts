import { apiClient } from "./client";
import type { SoilVariable, AlertSeverity, AlertStatus } from "@/types";

export type ReportFormat = "pdf" | "excel";
export interface ReportFilters {
  from: string;
  to: string;
  nodeIds: string[];
  cropIds: string[];
  sections: Array<"summary" | "readings" | "alerts">;
}

export interface ReportPreview {
  generatedAt: string;
  range: { from: string; to: string };
  filters: ReportFilters;
  nodes: Array<{
    id: string;
    name: string;
    deviceId: string;
    crop: { id: string; name: string } | null;
  }>;
  summary: {
    nodeCount: number;
    readingCount: number;
    alertCount: number;
    severityCounts: Record<AlertSeverity, number>;
    averages: Record<SoilVariable, number | null>;
  };
  chart: Array<{ date: string; humidity: number }>;
  readings: Array<{
    nodeId: string;
    timestamp: string;
    humidity: number;
    ph: number;
    salinity: number;
    soilTemp: number;
    ambientTemp: number;
  }>;
  alerts: Array<{
    nodeId: string;
    createdAt: string;
    variable: string;
    value: number;
    rangeMin: number;
    rangeMax: number;
    severity: AlertSeverity;
    status: AlertStatus;
    message: string;
  }>;
}

export interface ReportHistoryItem {
  id: string;
  format: ReportFormat;
  filters: ReportFilters;
  createdAt: string;
  shares: Array<{ expiresAt: string }>;
}

function filterParams(filters: ReportFilters) {
  return {
    from: filters.from,
    to: filters.to,
    nodeIds: filters.nodeIds.join(","),
    cropIds: filters.cropIds.join(","),
    sections: filters.sections.join(","),
  };
}

export async function getReportPreview(filters: ReportFilters): Promise<ReportPreview> {
  const { data } = await apiClient.get<ReportPreview>("/reports/general", {
    params: filterParams(filters),
  });
  return data;
}

export async function exportReport(
  filters: ReportFilters,
  format: ReportFormat,
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/reports/export", {
    params: { ...filterParams(filters), format },
    responseType: "blob",
  });
  return data;
}

export async function createReportShare(
  filters: ReportFilters,
  format: ReportFormat,
): Promise<{ token: string; expiresAt: string; format: ReportFormat }> {
  const { data } = await apiClient.post("/reports/share", {
    ...filterParams(filters),
    format,
  });
  return data;
}

export async function listReportHistory(): Promise<ReportHistoryItem[]> {
  const { data } = await apiClient.get<{ reports: ReportHistoryItem[] }>(
    "/reports/history",
  );
  return data.reports;
}

export function getSharedReportUrl(token: string): string {
  const baseUrl = String(apiClient.defaults.baseURL || "/api").replace(/\/$/, "");
  return `${baseUrl}/reports/share/${encodeURIComponent(token)}`;
}
