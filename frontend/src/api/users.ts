import { apiClient } from "./client";
import type { User, UserRole } from "@/types";

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">> & {
  password?: string;
  active?: boolean;
};

export async function listUsers(): Promise<User[]> {
  const { data } = await apiClient.get<{ users: User[] }>("/users");
  return data.users;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<{ user: User }>("/users", input);
  return data.user;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await apiClient.put<{ user: User }>(`/users/${id}`, input);
  return data.user;
}

export async function deactivateUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
