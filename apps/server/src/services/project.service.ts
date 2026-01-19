/**
 * Project Service
 */

import { generateUUID } from "../auth/password.js";
import type { Project } from "../db/schema.js";
import { ConflictError, NotFoundError } from "../lib/errors.js";
import type { ProjectRepository } from "../repositories";

export interface CreateProjectData {
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  repoUrl?: string;
}

export class ProjectService {
  constructor(private projectRepo: ProjectRepository) {}

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    const existing = await this.projectRepo.findBySlug(data.slug);
    if (existing) {
      throw new ConflictError(
        `Project with slug '${data.slug}' already exists`
      );
    }

    const now = new Date();
    return this.projectRepo.create({
      id: generateUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project> {
    const project = await this.projectRepo.findById(id);
    if (!project) {
      throw new NotFoundError("Project");
    }
    return project;
  }

  /**
   * List projects for an organization
   */
  async listProjects(orgId: string): Promise<Project[]> {
    return this.projectRepo.findByOrgId(orgId);
  }

  /**
   * Update project details
   */
  async updateProject(
    id: string,
    data: Partial<CreateProjectData>
  ): Promise<Project> {
    const project = await this.projectRepo.update(id, data);
    if (!project) {
      throw new NotFoundError("Project");
    }
    return project;
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    const deleted = await this.projectRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("Project");
    }
  }
}
