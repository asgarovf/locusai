/**
 * Event Repository - Drizzle Implementation
 */

import { desc, eq } from "drizzle-orm";
import type { Event, NewEvent } from "../db/schema.js";
import { events } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class EventRepository extends DrizzleRepository {
  /**
   * Find events by task ID
   */
  async findByTaskId(taskId: number): Promise<Event[]> {
    return await this.db
      .select()
      .from(events)
      .where(eq(events.taskId, taskId))
      .orderBy(desc(events.createdAt));
  }

  /**
   * Find event by ID
   */
  async findById(id: number): Promise<Event | undefined> {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event;
  }

  /**
   * Create a new event
   */
  async create(data: NewEvent): Promise<Event> {
    const [event] = await this.db.insert(events).values(data).returning();
    return event;
  }

  /**
   * Find pending CI events for a project
   * (Simplified: for now we use a raw filter on events table)
   */
  async findPendingCi(_projectId: string): Promise<Event[]> {
    // This requires a join with tasks to filter by projectId
    // For now we'll do a simpler workaround or just return all CI_RAN with deferred: true
    const rows = await this.db
      .select()
      .from(events)
      .where(eq(events.type, "CI_RAN"));

    return (rows as Event[]).filter((r) => {
      const p = r.payload as { deferred?: boolean; processed?: boolean };
      return p?.deferred === true && p?.processed === false;
    });
  }

  /**
   * Update event payload
   */
  async updatePayload(id: number, payload: unknown): Promise<void> {
    await this.db.update(events).set({ payload }).where(eq(events.id, id));
  }

  /**
   * Delete all events for a task
   */
  async deleteByTaskId(taskId: number): Promise<boolean> {
    const result = await this.db
      .delete(events)
      .where(eq(events.taskId, taskId))
      .returning({ id: events.id });
    return result.length > 0;
  }
}
