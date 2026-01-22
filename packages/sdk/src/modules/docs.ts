import {
  CreateDoc,
  CreateDocGroup,
  Doc,
  DocGroup,
  DocGroupResponse,
  DocGroupsResponse,
  DocResponse,
  DocsResponse,
  UpdateDoc,
  UpdateDocGroup,
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

  // Group Management
  async listGroups(workspaceId: string): Promise<DocGroup[]> {
    const { data } = await this.api.get<DocGroupsResponse>(
      `/workspaces/${workspaceId}/doc-groups`
    );
    return data.groups;
  }

  async createGroup(
    workspaceId: string,
    body: CreateDocGroup
  ): Promise<DocGroup> {
    const { data } = await this.api.post<DocGroupResponse>(
      `/workspaces/${workspaceId}/doc-groups`,
      body
    );
    return data.group;
  }

  async updateGroup(
    id: string,
    workspaceId: string,
    body: UpdateDocGroup
  ): Promise<DocGroup> {
    const { data } = await this.api.patch<DocGroupResponse>(
      `/workspaces/${workspaceId}/doc-groups/${id}`,
      body
    );
    return data.group;
  }

  async deleteGroup(id: string, workspaceId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/doc-groups/${id}`);
  }
}
