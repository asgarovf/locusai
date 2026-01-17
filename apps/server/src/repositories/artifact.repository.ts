import { BaseRepository } from "./base.repository.js";

export interface DBArtifact {
  id: number;
  taskId: number;
  type: string;
  title: string;
  contentText?: string;
  filePath?: string;
  createdBy: string;
  createdAt: number;
}

export class ArtifactRepository extends BaseRepository {
  findByTaskId(taskId: number | string): DBArtifact[] {
    return this.db
      .prepare(
        "SELECT * FROM artifacts WHERE taskId = ? ORDER BY createdAt DESC"
      )
      .all(taskId) as DBArtifact[];
  }

  create(data: Omit<DBArtifact, "id" | "createdAt">): void {
    const now = Date.now();
    this.db
      .prepare(`
        INSERT INTO artifacts (taskId, type, title, contentText, filePath, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.taskId,
        data.type,
        data.title,
        data.contentText ?? null,
        data.filePath ?? null,
        data.createdBy,
        now
      );
  }

  deleteByTaskId(taskId: number | string): void {
    this.db.prepare("DELETE FROM artifacts WHERE taskId = ?").run(taskId);
  }
}
