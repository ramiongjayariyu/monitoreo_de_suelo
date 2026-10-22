import { apiClient } from "./client";
import type { SoilVariable } from "@/types";

export type HistoryGranularity = "hour" | "day" | "week";
export type HistoryRange = { from: string; to: string };

export interface HistoryPoint {
  timestamp: string;
  value: number;
  count: number;
}

export interface HistorySeries {
  node: { id: string; name: string };
  variable: SoilVariable;
  granularity: HistoryGranularity;
  range: HistoryRange;
  points: HistoryPoint[];
}

export interface HistoryComparison {
  variable: SoilVariable;
  granularity: HistoryGranularity;
  range: HistoryRange;
  series: Array<{
    nodeId: string;
    nodeName: string;
    points: HistoryPoint[];
  }>;
}

export type HistoryResult = HistorySeries | HistoryComparison;

export interface HistoryCorrelation {
  node: { id: string; name: string };
  variables: { varA: SoilVariable; varB: SoilVariable };
  range: HistoryRange;
  coefficient: number | null;
  sampleCount: number;
  points: Array<{ timestamp: string; x: number; y: number }>;
}

export async function getHistory(params: {
  nodeId: string;
  variable: SoilVariable;
  granularity: HistoryGranularity;
  from: string;
  to: string;
}): Promise<HistorySeries> {
  const { data } = await apiClient.get<HistorySeries>("/history", { params });
  return data;
}

export async function compareHistory(params: {
  nodeIds: string[];
  variable: SoilVariable;
  granularity: HistoryGranularity;
  from: string;
  to: string;
}): Promise<HistoryComparison> {
  const { data } = await apiClient.get<HistoryComparison>("/history/compare", {
    params: { ...params, nodeIds: params.nodeIds.join(",") },
  });
  return data;
}

export async function getHistoryCorrelation(params: {
  nodeId: string;
  varA: SoilVariable;
  varB: SoilVariable;
  from: string;
  to: string;
}): Promise<HistoryCorrelation> {
  const { data } = await apiClient.get<HistoryCorrelation>("/history/correlation", {
    params,
  });
  return data;
}
