import {
  Artifact,
  ArtifactResponse,
  ArtifactsResponse,
  CreateArtifact,
} from "@locusai/shared";
import { BaseModule } from "./base";

export class ArtifactsModule extends BaseModule {
  async create(
    workspaceId: string,
    taskId: string,
    body: CreateArtifact
  ): Promise<Artifact> {
    const { data } = await this.api.post<ArtifactResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/artifacts`,
      body
    );
    return data.artifact;
  }

  async list(workspaceId: string, taskId: string): Promise<Artifact[]> {
    const { data } = await this.api.get<ArtifactsResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/artifacts`
    );
    return data.artifacts;
  }

  async getById(
    workspaceId: string,
    taskId: string,
    artifactId: string
  ): Promise<Artifact> {
    const { data } = await this.api.get<ArtifactResponse>(
      `/workspaces/${workspaceId}/tasks/${taskId}/artifacts/${artifactId}`
    );
    return data.artifact;
  }

  async delete(
    workspaceId: string,
    taskId: string,
    artifactId: string
  ): Promise<void> {
    await this.api.delete(
      `/workspaces/${workspaceId}/tasks/${taskId}/artifacts/${artifactId}`
    );
  }
}
