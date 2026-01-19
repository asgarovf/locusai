/**
 * Artifact Service
 */

import type { Artifact } from "../db/schema.js";
import { NotFoundError } from "../lib/errors.js";
import type { ArtifactRepository } from "../repositories/artifact.repository.js";

export class ArtifactService {
  constructor(private artifactRepo: ArtifactRepository) {}

  /**
   * Get all artifacts for a task
   */
  async getByTaskId(taskId: number): Promise<Artifact[]> {
    return this.artifactRepo.findByTaskId(taskId);
  }

  /**
   * Get content for an artifact
   */
  async getArtifactContent(taskId: number, type: string): Promise<string> {
    const artifact = await this.artifactRepo.findByType(taskId, type);

    if (!artifact || !artifact.contentText) {
      throw new NotFoundError("Artifact content");
    }

    return artifact.contentText;
  }
}
