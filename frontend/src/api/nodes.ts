import { apiClient } from "./client";
import type { AlertSeverity, NodeStatus } from "@/types";

export interface NodeRecord {
  id: string;
  deviceId: string;
  name: string;
  notes: string | null;
  posX: number;
  posY: number;
  cropId: string | null;
  stateId: string | null;
  samplingFreq: number;
  status: NodeStatus;
  battery: number | null;
  lastReading: string | null;
  createdAt: string;
  updatedAt: string;
  crop: { id: string; name: string } | null;
  state: { id: string; name: string; isActive: boolean } | null;
  readings: Array<{
    id: string;
    humidity: number;
    ph: number;
    salinity: number;
    soilTemp: number;
    ambientTemp: number;
    timestamp: string;
  }>;
  _count: { readings: number; alerts: number };
}

export interface NodesFilter {
  search?: string;
  cropId?: string;
  status?: NodeStatus;
}

export interface MapNodeRecord {
  id: string;
  deviceId: string;
  name: string;
  posX: number;
  posY: number;
  status: NodeStatus;
  battery: number | null;
  lastReading: string | null;
  crop: { id: string; name: string } | null;
  state: { id: string; name: string; isActive: boolean } | null;
  readings: NodeRecord["readings"];
  alerts: Array<{
    id: string;
    severity: AlertSeverity;
    status: string;
    message: string;
  }>;
  mapStatus: "optimal" | "warning" | "critical" | "offline";
  alertLevel: AlertSeverity | "NONE";
}

export interface MapNodesFilter {
  cropId?: string;
  state?: string;
  connection?: NodeStatus;
  alertLevel?: AlertSeverity | "NONE";
}

export interface NodeInput {
  deviceId: string;
  name: string;
  notes: string | null;
  posX: number;
  posY: number;
  samplingFreq: number;
  cropId: string | null;
  stateId: string | null;
}

export interface NodeOptionsCrop {
  id: string;
  name: string;
  states: Array<{ id: string; name: string; isActive: boolean }>;
}

export async function listNodes(filters: NodesFilter = {}): Promise<NodeRecord[]> {
  const { data } = await apiClient.get<{ nodes: NodeRecord[] }>("/nodes", {
    params: filters,
  });
  return data.nodes;
}

export async function getNodeOptions(): Promise<NodeOptionsCrop[]> {
  const { data } = await apiClient.get<{ crops: NodeOptionsCrop[] }>("/nodes/options");
  return data.crops;
}

export async function getMapNodes(
  filters: MapNodesFilter = {},
): Promise<MapNodeRecord[]> {
  const { data } = await apiClient.get<{ nodes: MapNodeRecord[] }>("/nodes/map", {
    params: filters,
  });
  return data.nodes;
}

export async function createNode(input: NodeInput): Promise<NodeRecord> {
  const { data } = await apiClient.post<{ node: NodeRecord }>("/nodes", input);
  return data.node;
}

export async function updateNode(
  id: string,
  input: Partial<NodeInput>,
): Promise<NodeRecord> {
  const { data } = await apiClient.put<{ node: NodeRecord }>(`/nodes/${id}`, input);
  return data.node;
}

export async function deleteNode(id: string): Promise<void> {
  await apiClient.delete(`/nodes/${id}`);
}

export async function updateNodePosition(
  id: string,
  position: { posX: number; posY: number },
): Promise<NodeRecord> {
  const { data } = await apiClient.patch<{ node: NodeRecord }>(
    `/nodes/${id}/position`,
    position,
  );
  return data.node;
}

export async function assignNode(
  id: string,
  assignment: { cropId: string | null; stateId: string | null },
): Promise<NodeRecord> {
  const { data } = await apiClient.patch<{ node: NodeRecord }>(
    `/nodes/${id}/assign`,
    assignment,
  );
  return data.node;
}
