import { type Sprint } from "@locusai/shared";
import apiClient from "@/lib/api-client";

export const sprintService = {
  getAll: async () => {
    const res = await apiClient.get<{ success: boolean; sprints: Sprint[] }>(
      "/sprints"
    );
    return res.data.sprints;
  },

  getById: async (id: number) => {
    const res = await apiClient.get<{ success: boolean; sprint: Sprint }>(
      `/sprints/${id}`
    );
    return res.data.sprint;
  },

  getActive: async () => {
    const res = await apiClient.get<{
      success: boolean;
      sprint: Sprint | null;
    }>("/sprints/active");
    return res.data.sprint;
  },

  create: async (data: Partial<Sprint>) => {
    const res = await apiClient.post<{ success: boolean; sprint: Sprint }>(
      "/sprints",
      data
    );
    return res.data.sprint;
  },

  update: async (id: number, data: Partial<Sprint>) => {
    const res = await apiClient.patch<{ success: boolean; sprint: Sprint }>(
      `/sprints/${id}`,
      data
    );
    return res.data.sprint;
  },

  delete: async (id: number) => {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/sprints/${id}`
    );
    return res.data;
  },
};
