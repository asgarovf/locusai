/**
 * API Key Repository
 */

import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../db/drizzle.js";
import { type APIKey, apiKeys, type NewAPIKey } from "../db/schema.js";

export class ApiKeyRepository {
  constructor(private db: DrizzleDB) {}

  async findById(id: string): Promise<APIKey | undefined> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id));
    return key;
  }

  async findByProjectId(projectId: string): Promise<APIKey[]> {
    return await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.projectId, projectId));
  }

  async findByPrefix(prefix: string): Promise<APIKey | undefined> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix));
    return key;
  }

  async create(data: NewAPIKey): Promise<APIKey> {
    const [key] = await this.db.insert(apiKeys).values(data).returning();
    return key;
  }

  async update(
    id: string,
    data: Partial<NewAPIKey>
  ): Promise<APIKey | undefined> {
    const [updated] = await this.db
      .update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning();
    return result.length > 0;
  }
}
