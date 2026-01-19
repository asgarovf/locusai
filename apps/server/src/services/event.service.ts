/**
 * Event Service
 */

import type { Event } from "../db/schema.js";
import type { EventRepository } from "../repositories/event.repository.js";

export class EventService {
  constructor(private eventRepo: EventRepository) {}

  /**
   * Get all events for a specific task
   */
  async getByTaskId(taskId: number): Promise<Event[]> {
    return this.eventRepo.findByTaskId(taskId);
  }
}
