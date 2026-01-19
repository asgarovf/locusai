/**
 * Organization Repository
 */

import { eq } from "drizzle-orm";
import type { NewOrganization, Organization } from "../db/schema.js";
import { organizations } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class OrganizationRepository extends DrizzleRepository {
  /**
   * Find an organization by ID
   */
  async findById(id: string): Promise<Organization | undefined> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  /**
   * Find an organization by slug
   */
  async findBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return org;
  }

  /**
   * Create a new organization
   */
  async create(data: NewOrganization): Promise<Organization> {
    const [org] = await this.db.insert(organizations).values(data).returning();
    return org;
  }

  /**
   * Update an organization
   */
  async update(
    id: string,
    data: Partial<NewOrganization>
  ): Promise<Organization | undefined> {
    const [updated] = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete an organization
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning({ id: organizations.id });
    return result.length > 0;
  }
}
