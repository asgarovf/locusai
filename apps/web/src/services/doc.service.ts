import apiClient from "@/lib/api-client";

export interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

export const docService = {
  getTree: async () => {
    const response = await apiClient.get<{ success: boolean; tree: DocNode[] }>(
      "/docs/tree"
    );
    return response.data.tree;
  },

  read: async (path: string) => {
    const response = await apiClient.get<{ success: boolean; content: string }>(
      `/docs/read?path=${encodeURIComponent(path)}`
    );
    return response.data.content;
  },

  write: async (path: string, content: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>("/docs/write", { path, content });
    return response.data;
  },
};
