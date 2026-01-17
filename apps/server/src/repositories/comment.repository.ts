import { BaseRepository } from "./base.repository.js";

export interface DBComment {
  id: number;
  taskId: number;
  author: string;
  text: string;
  createdAt: number;
}

export class CommentRepository extends BaseRepository {
  findByTaskId(taskId: number | string): DBComment[] {
    return this.db
      .prepare(
        "SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt DESC"
      )
      .all(taskId) as DBComment[];
  }

  create(taskId: number | string, author: string, text: string): void {
    const now = Date.now();
    this.db
      .prepare(
        "INSERT INTO comments (taskId, author, text, createdAt) VALUES (?, ?, ?, ?)"
      )
      .run(taskId, author, text, now);
  }

  deleteByTaskId(taskId: number | string): void {
    this.db.prepare("DELETE FROM comments WHERE taskId = ?").run(taskId);
  }
}
