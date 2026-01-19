/**
 * Task Repository - Drizzle Implementation
 */

import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import type { NewTask, Task } from "../db/schema.js";
import { tasks } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class TaskRepository extends DrizzleRepository {
  /**
   * Find all tasks
   */
  async findAll(): Promise<Task[]> {
    return await this.db.select().from(tasks).orderBy(asc(tasks.createdAt));
  }

  /**
   * Find task by ID
   */
  async findById(id: number): Promise<Task | undefined> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  /**
   * Create a new task
   */
  async create(data: NewTask): Promise<Task> {
    const [task] = await this.db.insert(tasks).values(data).returning();
    return task;
  }

  /**
   * Update a task
   */
  async update(id: number, data: Partial<NewTask>): Promise<Task | undefined> {
    const [updated] = await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete a task
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return result.length > 0;
  }

  /**
   * Find a candidate task for dispatch (locking it in the process)
   */
  async findCandidateForDispatch(
    sprintId: number,
    agentName: string,
    lockDurationMs: number
  ): Promise<Task | undefined> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lockDurationMs);

    // biome-ignore lint/suspicious/noExplicitAny: Transaction type complexity
    return await this.db.transaction(async (tx: any) => {
      // Find candidate
      const candidates = await tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, "BACKLOG"),
            eq(tasks.sprintId, sprintId),
            or(isNull(tasks.lockedBy), lt(tasks.lockExpiresAt, now))
          )
        )
        .orderBy(asc(tasks.priority), asc(tasks.createdAt))
        .limit(1);

      const candidate = candidates[0];

      if (!candidate) return undefined;

      // Lock it
      const [locked] = await tx
        .update(tasks)
        .set({
          lockedBy: agentName,
          lockExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(tasks.id, candidate.id))
        .returning();
      return locked;
    });
  }

  /**
   * Manual lock
   */
  async lock(id: number, agentId: string, expiresAt: Date): Promise<boolean> {
    const result = await this.db
      .update(tasks)
      .set({
        lockedBy: agentId,
        lockExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return result.length > 0;
  }

  /**
   * Manual unlock
   */
  async unlock(id: number): Promise<boolean> {
    const result = await this.db
      .update(tasks)
      .set({
        lockedBy: null,
        lockExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return result.length > 0;
  }
}
