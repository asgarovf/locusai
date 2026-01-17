import type { SQLQueryBindings } from "bun:sqlite";
import type { Task } from "@locusai/shared";
import { CreateTaskData } from "../services/task.service.js";
import { BaseRepository } from "./base.repository.js";

export class TaskRepository extends BaseRepository {
  findAll(): Task[] {
    const tasks = this.db
      .prepare("SELECT * FROM tasks ORDER BY createdAt DESC")
      .all() as Task[];

    return tasks.map((t) => this.format(t));
  }

  findById(id: number | string): Task | undefined {
    const task = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
      | Task
      | undefined;

    return task ? this.format(task) : undefined;
  }

  create(data: CreateTaskData): number {
    const {
      title,
      description,
      status,
      priority,
      labels,
      assigneeRole,
      parentId,
      sprintId,
      acceptanceChecklist,
    } = data;
    const now = Date.now();

    const result = this.db
      .prepare(`
        INSERT INTO tasks (title, description, status, priority, labels, assigneeRole, parentId, sprintId, acceptanceChecklist, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        title,
        description,
        status,
        priority || "MEDIUM",
        JSON.stringify(labels || []),
        assigneeRole ?? null,
        parentId ?? null,
        sprintId ?? null,
        JSON.stringify(acceptanceChecklist || []),
        now,
        now
      );

    return result.lastInsertRowid as number;
  }

  update(id: number | string, updates: Partial<Task>): void {
    const fields: string[] = [];
    const vals: unknown[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (key === "id" || key === "createdAt" || key === "updatedAt") continue;
      fields.push(`${key} = ?`);
      vals.push(typeof val === "object" ? JSON.stringify(val) : val);
    }

    if (fields.length === 0) return;

    vals.push(Date.now(), id);

    const stmt = this.db.prepare(
      `UPDATE tasks SET ${fields.join(", ")}, updatedAt = ? WHERE id = ?`
    );
    (stmt.run as (...args: unknown[]) => void)(...vals);
  }

  delete(id: number | string): void {
    this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  }

  findCandidateForDispatch(
    now: number,
    sprintId: number,
    agentName: string,
    expiresAt: number
  ): Task | undefined {
    return this.db.transaction(() => {
      const query = `
        SELECT * FROM tasks 
        WHERE status = 'BACKLOG' 
        AND (lockedBy IS NULL OR lockExpiresAt < ?)
        AND sprintId = ?
        ORDER BY 
          CASE priority 
            WHEN 'CRITICAL' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            WHEN 'LOW' THEN 4 
            ELSE 5 
          END ASC,
          createdAt ASC
        LIMIT 1
      `;
      const params: SQLQueryBindings[] = [now, sprintId];

      const candidate = this.db.prepare(query).get(...params) as
        | Task
        | undefined;

      if (!candidate) return undefined;

      // Lock it
      this.db
        .prepare(
          "UPDATE tasks SET lockedBy = ?, lockExpiresAt = ?, updatedAt = ? WHERE id = ?"
        )
        .run(agentName, expiresAt, now, candidate.id);

      return this.format(candidate);
    })();
  }

  lock(
    id: number | string,
    agentId: string,
    expiresAt: number,
    now: number
  ): void {
    this.db
      .prepare(
        "UPDATE tasks SET lockedBy = ?, lockExpiresAt = ?, updatedAt = ? WHERE id = ?"
      )
      .run(agentId, expiresAt, now, id);
  }

  unlock(id: number | string, now: number): void {
    this.db
      .prepare(
        "UPDATE tasks SET lockedBy = NULL, lockExpiresAt = NULL, updatedAt = ? WHERE id = ?"
      )
      .run(now, id);
  }

  private format(task: Task): Task {
    return {
      ...task,
      labels:
        typeof task.labels === "string"
          ? JSON.parse(task.labels || "[]")
          : task.labels || [],
      acceptanceChecklist:
        typeof task.acceptanceChecklist === "string"
          ? JSON.parse(task.acceptanceChecklist || "[]")
          : task.acceptanceChecklist || [],
    };
  }
}
