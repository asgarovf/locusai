import { type Sprint } from "@locusai/shared";
import apiClient from "@/lib/api-client";

export const sprintService = {
  getAll: async () => {
    const res = await apiClient.get<Sprint[]>("/sprints");
    return res.data;
  },

  create: async (data: Partial<Sprint>) => {
    const res = await apiClient.post<{ id: number }>("/sprints", data);
    return res.data;
  },

  update: async (id: number, data: Partial<Sprint>) => {
    const res = await apiClient.patch(`/sprints/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await apiClient.delete(`/sprints/${id}`);
    return res.data;
  },
};
