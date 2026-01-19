/**
 * API Key Service
 */

import { generateAPIKey, generateUUID, hashAPIKey } from "../auth/password.js";
import type { APIKey } from "../db/schema.js";
import { NotFoundError } from "../lib/errors.js";
import type { ApiKeyRepository } from "../repositories/api-key.repository.ts";

export interface CreateKeyData {
  userId: string;
  projectId: string;
  name: string;
  expiresInDays?: number;
}

export class ApiKeyService {
  constructor(private apiKeyRepo: ApiKeyRepository) {}

  /**
   * Create a new API key
   * Returns the raw key (only shown once) and the stored record
   */
  async createKey(
    data: CreateKeyData
  ): Promise<{ key: string; record: APIKey }> {
    const { key, prefix } = generateAPIKey();
    const hash = await hashAPIKey(key);
    const now = new Date();

    let expiresAt: Date | undefined;
    if (data.expiresInDays) {
      expiresAt = new Date(
        now.getTime() + data.expiresInDays * 24 * 60 * 60 * 1000
      );
    }

    const record = await this.apiKeyRepo.create({
      id: generateUUID(),
      userId: data.userId,
      projectId: data.projectId,
      name: data.name,
      keyPrefix: prefix,
      keyHash: hash,
      expiresAt,
      createdAt: now,
    });

    return { key, record };
  }

  /**
   * List keys for a project
   */
  async listKeys(projectId: string): Promise<APIKey[]> {
    return this.apiKeyRepo.findByProjectId(projectId);
  }

  /**
   * Delete a key
   */
  async deleteKey(id: string): Promise<void> {
    const deleted = await this.apiKeyRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("API Key");
    }
  }

  /**
   * Verify an API key
   */
  async verifyKey(rawKey: string): Promise<APIKey | undefined> {
    if (!rawKey.startsWith("lk_")) return undefined;

    const prefix = rawKey.substring(0, 11);
    const record = await this.apiKeyRepo.findByPrefix(prefix);

    if (!record) return undefined;

    const hash = await hashAPIKey(rawKey);
    if (hash !== record.keyHash) return undefined;

    if (record.expiresAt && record.expiresAt < new Date()) {
      return undefined;
    }

    // Update last used at
    await this.apiKeyRepo.update(record.id, { lastUsedAt: new Date() });

    return record;
  }
}
