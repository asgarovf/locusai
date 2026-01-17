import { BaseRepository } from "./base.repository.js";

export interface DBSprint {
  id: number;
  name: string;
  status: string;
  startDate?: number;
  endDate?: number;
  createdAt: number;
}

export class SprintRepository extends BaseRepository {
  findAll(): DBSprint[] {
    return this.db
      .prepare("SELECT * FROM sprints ORDER BY createdAt DESC")
      .all() as DBSprint[];
  }

  findById(id: number | string): DBSprint | undefined {
    return this.db.prepare("SELECT * FROM sprints WHERE id = ?").get(id) as
      | DBSprint
      | undefined;
  }

  findActive(): DBSprint | undefined {
    return this.db
      .prepare("SELECT * FROM sprints WHERE status = 'ACTIVE' LIMIT 1")
      .get() as DBSprint | undefined;
  }

  create(name: string): number {
    const now = Date.now();
    const result = this.db
      .prepare(
        "INSERT INTO sprints (name, status, createdAt) VALUES (?, 'PLANNED', ?)"
      )
      .run(name, now);
    return result.lastInsertRowid as number;
  }

  update(id: number | string, updates: Partial<DBSprint>): void {
    const fields: string[] = [];
    const vals: unknown[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (key === "id" || key === "createdAt") continue;
      fields.push(`${key} = ?`);
      vals.push(val);
    }

    if (fields.length === 0) return;

    vals.push(id);

    const stmt = this.db.prepare(
      `UPDATE sprints SET ${fields.join(", ")} WHERE id = ?`
    );
    (stmt.run as (...args: unknown[]) => void)(...vals);
  }
}
