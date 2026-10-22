import { apiClient } from "./client";
import type { CropRanges, MeasurementRange } from "@/types";

export interface CropRecord {
  id: string;
  name: string;
  description: string | null;
  ranges: CropRanges;
  createdAt: string;
  updatedAt: string;
  _count: { nodes: number; states: number };
}

export interface CropInput {
  name: string;
  description: string | null;
  ranges: CropRanges;
}

export interface CropStateRecord {
  id: string;
  cropId: string;
  name: string;
  order: number;
  isActive: boolean;
  ranges: CropRanges;
  createdAt: string;
  updatedAt: string;
  _count: { nodes: number };
}

export interface CropStatesResponse {
  crop: Pick<CropRecord, "id" | "name" | "description" | "ranges">;
  states: CropStateRecord[];
}

export interface CropStateInput {
  name: string;
  order: number;
  isActive: boolean;
  ranges: CropRangesInput;
}

export type CropRangesInput = Record<keyof CropRanges, MeasurementRange>;

export async function listCrops(search?: string): Promise<CropRecord[]> {
  const { data } = await apiClient.get<{ crops: CropRecord[] }>("/crops", {
    params: search?.trim() ? { search: search.trim() } : {},
  });
  return data.crops;
}

export async function createCrop(input: CropInput): Promise<CropRecord> {
  const { data } = await apiClient.post<{ crop: CropRecord }>("/crops", input);
  return data.crop;
}

export async function updateCrop(
  id: string,
  input: Partial<CropInput>,
): Promise<CropRecord> {
  const { data } = await apiClient.put<{ crop: CropRecord }>(`/crops/${id}`, input);
  return data.crop;
}

export async function deleteCrop(id: string): Promise<void> {
  await apiClient.delete(`/crops/${id}`);
}

export async function getCropStates(cropId: string): Promise<CropStatesResponse> {
  const { data } = await apiClient.get<CropStatesResponse>(`/crops/${cropId}/states`);
  return data;
}

export async function createCropState(
  cropId: string,
  input: CropStateInput,
): Promise<CropStateRecord> {
  const { data } = await apiClient.post<{ state: CropStateRecord }>(
    `/crops/${cropId}/states`,
    input,
  );
  return data.state;
}

export async function updateCropState(
  id: string,
  input: CropStateInput,
): Promise<CropStateRecord> {
  const { data } = await apiClient.put<{ state: CropStateRecord }>(
    `/crops/states/${id}`,
    input,
  );
  return data.state;
}

export async function activateCropState(id: string): Promise<CropStateRecord> {
  const { data } = await apiClient.patch<{ state: CropStateRecord }>(
    `/crops/states/${id}/activate`,
  );
  return data.state;
}

export async function deleteCropState(id: string): Promise<void> {
  await apiClient.delete(`/crops/states/${id}`);
}
