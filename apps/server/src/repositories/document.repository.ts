/**
 * Document Repository - Drizzle Implementation
 */

import { and, desc, eq, like } from "drizzle-orm";
import type { Document, NewDocument } from "../db/schema.js";
import { documents } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class DocumentRepository extends DrizzleRepository {
  /**
   * Find all documents for a project
   */
  async findByProjectId(projectId: string): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.updatedAt));
  }

  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<Document | undefined> {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return doc;
  }

  /**
   * Find a document by path within a project
   */
  async findByPath(
    projectId: string,
    path: string
  ): Promise<Document | undefined> {
    const [doc] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.path, path)));
    return doc;
  }

  /**
   * Find all documents matching a path prefix (for tree building)
   */
  async findByPathPrefix(
    projectId: string,
    pathPrefix: string
  ): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          like(documents.path, `${pathPrefix}%`)
        )
      )
      .orderBy(documents.path);
  }

  /**
   * Create a new document
   */
  async create(data: NewDocument): Promise<Document> {
    const [doc] = await this.db.insert(documents).values(data).returning();
    return doc;
  }

  /**
   * Update a document
   */
  async update(
    id: string,
    data: Partial<
      Pick<Document, "title" | "content" | "updatedBy" | "updatedAt">
    >
  ): Promise<Document | undefined> {
    const result = await this.db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }

  /**
   * Upsert a document by path
   */
  async upsertByPath(
    projectId: string,
    path: string,
    data: Omit<NewDocument, "id" | "projectId" | "path">
  ): Promise<Document> {
    const existing = await this.findByPath(projectId, path);

    if (existing) {
      const updated = await this.update(existing.id, {
        title: data.title,
        content: data.content,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      });
      if (!updated) {
        throw new Error("Failed to update document");
      }
      return updated;
    }

    return this.create({
      id: crypto.randomUUID(),
      projectId,
      path,
      ...data,
    });
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning({ id: documents.id });
    return result.length > 0;
  }

  /**
   * Delete a document by path
   */
  async deleteByPath(projectId: string, path: string): Promise<boolean> {
    const result = await this.db
      .delete(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.path, path)))
      .returning({ id: documents.id });
    return result.length > 0;
  }

  /**
   * Delete all documents by path prefix
   */
  async deleteByPathPrefix(
    projectId: string,
    pathPrefix: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(documents)
      .where(
        and(
          eq(documents.projectId, projectId),
          like(documents.path, `${pathPrefix}/%`)
        )
      )
      .returning({ id: documents.id });
    return result.length > 0;
  }
}
