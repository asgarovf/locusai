/**
 * Project Repository
 */

import { eq } from "drizzle-orm";
import type { NewProject, Project } from "../db/schema.js";
import { projects } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class ProjectRepository extends DrizzleRepository {
  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<Project | undefined> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  /**
   * Find a project by slug
   */
  async findBySlug(slug: string): Promise<Project | undefined> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug));
    return project;
  }

  /**
   * Get all projects for an organization
   */
  async findByOrgId(orgId: string): Promise<Project[]> {
    return await this.db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId));
  }

  /**
   * Create a new project
   */
  async create(data: NewProject): Promise<Project> {
    const [project] = await this.db.insert(projects).values(data).returning();
    return project;
  }

  /**
   * Update a project
   */
  async update(
    id: string,
    data: Partial<NewProject>
  ): Promise<Project | undefined> {
    const [updated] = await this.db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    return result.length > 0;
  }
}
