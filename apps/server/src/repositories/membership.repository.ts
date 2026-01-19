/**
 * Membership Repository
 */

import { and, eq } from "drizzle-orm";
import type { Membership, NewMembership } from "../db/schema.js";
import { memberships, users } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class MembershipRepository extends DrizzleRepository {
  /**
   * Find a membership by user and org
   */
  async findByUserAndOrg(
    userId: string,
    orgId: string
  ): Promise<Membership | undefined> {
    const [membership] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)));
    return membership;
  }

  /**
   * List all members of an organization with user details
   */
  async listByOrgId(orgId: string) {
    return await this.db
      .select({
        id: memberships.id,
        role: memberships.role,
        createdAt: memberships.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, orgId));
  }

  /**
   * Create a membership
   */
  async create(data: NewMembership): Promise<Membership> {
    const [membership] = await this.db
      .insert(memberships)
      .values(data)
      .returning();
    return membership;
  }

  /**
   * Update membership role
   */
  async updateRole(id: string, role: string): Promise<Membership | undefined> {
    const [updated] = await this.db
      .update(memberships)
      .set({ role })
      .where(eq(memberships.id, id))
      .returning();
    return updated;
  }

  /**
   * Remove a membership
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(memberships)
      .where(eq(memberships.id, id))
      .returning({ id: memberships.id });
    return result.length > 0;
  }
}
