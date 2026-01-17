import { BaseRepository } from "./base.repository.js";

export interface DBEvent {
  id: number;
  taskId: number;
  type: string;
  payload: string;
  createdAt: number;
}

export class EventRepository extends BaseRepository {
  findByTaskId(taskId: number | string): DBEvent[] {
    return this.db
      .prepare("SELECT * FROM events WHERE taskId = ? ORDER BY createdAt DESC")
      .all(taskId) as DBEvent[];
  }

  create(
    taskId: number | string,
    type: string,
    payload: Record<string, unknown>
  ): void {
    const now = Date.now();
    this.db
      .prepare(
        "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
      )
      .run(String(taskId), type, JSON.stringify(payload), now);
  }

  deleteByTaskId(taskId: number | string): void {
    this.db.prepare("DELETE FROM events WHERE taskId = ?").run(taskId);
  }
}
