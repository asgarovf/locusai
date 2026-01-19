/**
 * Sprint Repository - Drizzle Implementation
 */

import { desc, eq } from "drizzle-orm";
import type { NewSprint, Sprint } from "../db/schema.js";
import { sprints } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class SprintRepository extends DrizzleRepository {
  /**
   * Find all sprints
   */
  async findAll(): Promise<Sprint[]> {
    return await this.db
      .select()
      .from(sprints)
      .orderBy(desc(sprints.createdAt));
  }

  /**
   * Find sprint by ID
   */
  async findById(id: number): Promise<Sprint | undefined> {
    const [sprint] = await this.db
      .select()
      .from(sprints)
      .where(eq(sprints.id, id));
    return sprint;
  }

  /**
   * Find active sprint
   */
  async findActive(): Promise<Sprint | undefined> {
    const [sprint] = await this.db
      .select()
      .from(sprints)
      .where(eq(sprints.status, "ACTIVE"))
      .limit(1);
    return sprint;
  }

  /**
   * Create a new sprint
   */
  async create(data: NewSprint): Promise<Sprint> {
    const [sprint] = await this.db.insert(sprints).values(data).returning();
    return sprint;
  }

  /**
   * Update a sprint
   */
  async update(
    id: number,
    data: Partial<NewSprint>
  ): Promise<Sprint | undefined> {
    const [updated] = await this.db
      .update(sprints)
      .set(data)
      .where(eq(sprints.id, id))
      .returning();
    return updated;
  }
}
