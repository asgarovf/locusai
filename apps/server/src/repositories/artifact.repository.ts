/**
 * Artifact Repository - Drizzle Implementation
 */

import { and, desc, eq } from "drizzle-orm";
import type { Artifact, NewArtifact } from "../db/schema.js";
import { artifacts } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class ArtifactRepository extends DrizzleRepository {
  /**
   * Find artifacts by task ID
   */
  async findByTaskId(taskId: number): Promise<Artifact[]> {
    return await this.db
      .select()
      .from(artifacts)
      .where(eq(artifacts.taskId, taskId))
      .orderBy(desc(artifacts.createdAt));
  }

  /**
   * Find artifact by task ID and type
   */
  async findByType(
    taskId: number,
    type: string
  ): Promise<Artifact | undefined> {
    const [artifact] = await this.db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.taskId, taskId), eq(artifacts.type, type)))
      .orderBy(desc(artifacts.createdAt))
      .limit(1);
    return artifact;
  }

  /**
   * Create a new artifact
   */
  async create(data: NewArtifact): Promise<Artifact> {
    const [created] = await this.db.insert(artifacts).values(data).returning();
    return created;
  }

  /**
   * Delete all artifacts for a task
   */
  async deleteByTaskId(taskId: number): Promise<boolean> {
    const result = await this.db
      .delete(artifacts)
      .where(eq(artifacts.taskId, taskId))
      .returning({ id: artifacts.id });
    return result.length > 0;
  }
}
