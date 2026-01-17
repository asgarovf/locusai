import { AssigneeRole, Task, TaskPriority, TaskStatus } from "@locusai/shared";
import apiClient from "@/lib/api-client";

export interface CreateTaskDto {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels?: string[];
  assigneeRole?: AssigneeRole;
  sprintId?: number | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  assigneeRole?: AssigneeRole;
  acceptanceCriteria?: { id: string; text: string; done: boolean }[];
  sprintId?: number | null;
}

export const taskService = {
  getAll: async () => {
    const response = await apiClient.get<Task[]>("/tasks");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  create: async (data: CreateTaskDto) => {
    const response = await apiClient.post<Task>("/tasks", data);
    return response.data;
  },

  update: async (id: number, data: UpdateTaskDto) => {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/tasks/${id}`);
  },

  addComment: async (id: number, data: { author: string; text: string }) => {
    const response = await apiClient.post<Task>(`/tasks/${id}/comment`, data);
    return response.data;
  },

  runCi: async (id: number, preset: string) => {
    const response = await apiClient.post<{ summary: string }>("/ci/run", {
      taskId: id,
      preset,
    });
    return response.data;
  },

  lock: async (id: number, agentId: string, ttlSeconds: number) => {
    const response = await apiClient.post(`/tasks/${id}/lock`, {
      agentId,
      ttlSeconds,
    });
    return response.data;
  },

  unlock: async (id: number, agentId: string) => {
    const response = await apiClient.post(`/tasks/${id}/unlock`, { agentId });
    return response.data;
  },
};
