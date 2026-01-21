import {
  CreateDoc,
  Doc,
  DocResponse,
  DocsResponse,
  UpdateDoc,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class DocsModule extends BaseModule {
  async create(workspaceId: string, body: CreateDoc): Promise<Doc> {
    const { data } = await this.api.post<DocResponse>(
      `/workspaces/${workspaceId}/docs`,
      body
    );
    return data.doc;
  }

  async list(workspaceId: string): Promise<Doc[]> {
    const { data } = await this.api.get<DocsResponse>(
      `/workspaces/${workspaceId}/docs`
    );
    return data.docs;
  }

  async getById(id: string, workspaceId: string): Promise<Doc> {
    const { data } = await this.api.get<DocResponse>(
      `/workspaces/${workspaceId}/docs/${id}`
    );
    return data.doc;
  }

  async update(id: string, workspaceId: string, body: UpdateDoc): Promise<Doc> {
    const { data } = await this.api.put<DocResponse>(
      `/workspaces/${workspaceId}/docs/${id}`,
      body
    );
    return data.doc;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/docs/${id}`);
  }
}
