/**
 * Sprint Service
 *
 * Implements business logic for sprint management.
 */

import type { NewSprint, Sprint } from "../db/schema.js";
import { NotFoundError } from "../lib/errors.js";
import type { SprintRepository } from "../repositories/sprint.repository.js";

export class SprintService {
  constructor(private sprintRepo: SprintRepository) {}

  /**
   * Get all sprints
   */
  async getAllSprints(): Promise<Sprint[]> {
    return this.sprintRepo.findAll();
  }

  /**
   * Get sprint by ID
   */
  async getSprintById(id: number): Promise<Sprint> {
    const sprint = await this.sprintRepo.findById(id);
    if (!sprint) throw new NotFoundError("Sprint");
    return sprint;
  }

  /**
   * Create a new sprint
   */
  async createSprint(name: string, projectId?: string): Promise<Sprint> {
    return this.sprintRepo.create({
      name,
      projectId,
      status: "PLANNED",
      createdAt: new Date(),
    });
  }

  /**
   * Update sprint details
   */
  async updateSprint(id: number, updates: Partial<NewSprint>): Promise<Sprint> {
    const sprint = await this.sprintRepo.update(id, updates);
    if (!sprint) throw new NotFoundError("Sprint");
    return sprint;
  }

  /**
   * Get currently active sprint
   */
  async getActiveSprint(): Promise<Sprint | undefined> {
    return this.sprintRepo.findActive();
  }
}
