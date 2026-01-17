import { type Sprint } from "@locus/shared";
import axios from "axios";

const API_URL = "http://localhost:3080/api/sprints";

export const sprintService = {
  getAll: async () => {
    const res = await axios.get<Sprint[]>(API_URL);
    return res.data;
  },

  create: async (data: Partial<Sprint>) => {
    const res = await axios.post<{ id: number }>(API_URL, data);
    return res.data;
  },

  update: async (id: number, data: Partial<Sprint>) => {
    const res = await axios.patch(`${API_URL}/${id}`, data);
    return res.data;
  },

  delete: async (id: number) => {
    const res = await axios.delete(`${API_URL}/${id}`);
    return res.data;
  },
};
