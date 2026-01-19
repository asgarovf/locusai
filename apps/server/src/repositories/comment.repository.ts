/**
 * Comment Repository - Drizzle Implementation
 */

import { desc, eq } from "drizzle-orm";
import type { Comment, NewComment } from "../db/schema.js";
import { comments } from "../db/schema.js";
import { DrizzleRepository } from "./drizzle.repository.js";

export class CommentRepository extends DrizzleRepository {
  /**
   * Find comments by task ID
   */
  async findByTaskId(taskId: number): Promise<Comment[]> {
    return await this.db
      .select()
      .from(comments)
      .where(eq(comments.taskId, taskId))
      .orderBy(desc(comments.createdAt));
  }

  /**
   * Create a new comment
   */
  async create(data: NewComment): Promise<Comment> {
    const [comment] = await this.db.insert(comments).values(data).returning();
    return comment;
  }

  /**
   * Delete all comments for a task
   */
  async deleteByTaskId(taskId: number): Promise<boolean> {
    const result = await this.db
      .delete(comments)
      .where(eq(comments.taskId, taskId))
      .returning({ id: comments.id });
    return result.length > 0;
  }
}
