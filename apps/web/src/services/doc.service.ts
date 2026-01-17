import apiClient from "@/lib/api-client";

export interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

export const docService = {
  getTree: async () => {
    const response = await apiClient.get<DocNode[]>("/docs/tree");
    return response.data;
  },

  read: async (path: string) => {
    const response = await apiClient.get<{ content: string }>(
      `/docs/read?path=${encodeURIComponent(path)}`
    );
    return response.data;
  },

  write: async (path: string, content: string) => {
    const response = await apiClient.post("/docs/write", { path, content });
    return response.data;
  },
};
