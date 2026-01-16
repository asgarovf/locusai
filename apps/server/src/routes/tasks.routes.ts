import type { Database } from "bun:sqlite";
import { type Task, TaskSchema } from "@locus/shared";
import { Router } from "express";
import { z } from "zod";
import type { TaskProcessor } from "../task-processor.js";

export function createTaskRouter(db: Database, processor?: TaskProcessor) {
  const router = Router();

  router.get("/", (_req, res) => {
    const tasks = db
      .prepare("SELECT * FROM tasks ORDER BY createdAt DESC")
      .all() as Task[];
    const formattedTasks = tasks.map((t) => ({
      ...t,
      labels: JSON.parse((t.labels as unknown as string) || "[]"),
      acceptanceChecklist: JSON.parse(
        (t.acceptanceChecklist as unknown as string) || "[]"
      ),
    }));
    res.json(formattedTasks);
  });

  router.post("/", (req, res) => {
    try {
      const {
        title,
        description,
        status,
        priority,
        labels,
        assigneeRole,
        parentId,
      } = req.body as z.infer<typeof TaskSchema>;
      const now = Date.now();
      const result = db
        .prepare(`
        INSERT INTO tasks (title, description, status, priority, labels, assigneeRole, parentId, acceptanceChecklist, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          title,
          description,
          status,
          priority,
          JSON.stringify(labels),
          assigneeRole ?? null,
          parentId ?? null,
          "[]",
          now,
          now
        );

      const taskId = result.lastInsertRowid;
      db.prepare(
        "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
      ).run(String(taskId), "TASK_CREATED", JSON.stringify({ title }), now);

      res.json({ id: taskId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Task creation error:", err);
      res.status(500).json({ error: { message } });
    }
  });

  router.get("/:id", (req, res) => {
    const task = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(req.params.id) as Task & {
      labels: string;
      acceptanceChecklist: string;
    };
    if (!task)
      return res.status(404).json({ error: { message: "Task not found" } });

    const formattedTask: Task = {
      ...task,
      labels: JSON.parse(task.labels || "[]"),
      acceptanceChecklist: JSON.parse(task.acceptanceChecklist || "[]"),
    };
    res.json(formattedTask);
  });

  router.patch("/:id", (req, res) => {
    const id = req.params.id;
    const updates = req.body;
    const oldTask = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(id as string) as Task | undefined;
    if (!oldTask)
      return res.status(404).json({ error: { message: "Task not found" } });

    const fields = [];
    const vals: unknown[] = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      vals.push(typeof val === "object" ? JSON.stringify(val) : val);
    }
    vals.push(Date.now(), id);

    const stmt = db.prepare(
      `UPDATE tasks SET ${fields.join(", ")}, updatedAt = ? WHERE id = ?`
    );
    (stmt.run as (...args: unknown[]) => void)(...(vals as unknown[]));

    if (updates.status && updates.status !== oldTask.status) {
      db.prepare(
        "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
      ).run(
        id as string,
        "STATUS_CHANGED",
        JSON.stringify({ from: oldTask.status, to: updates.status }),
        Date.now()
      );

      if (processor) {
        processor.onStatusChanged(id as string, oldTask.status, updates.status);
      }
    }

    res.json({ ok: true });
  });

  router.delete("/:id", (req, res) => {
    const id = req.params.id;
    const task = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(id as string) as Task | undefined;
    if (!task)
      return res.status(404).json({ error: { message: "Task not found" } });

    // Delete related data
    db.prepare("DELETE FROM comments WHERE taskId = ?").run(id as string);
    db.prepare("DELETE FROM events WHERE taskId = ?").run(id as string);
    db.prepare("DELETE FROM artifacts WHERE taskId = ?").run(id as string);

    // Delete the task
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id as string);

    res.json({ ok: true });
  });

  router.post("/:id/comment", (req, res) => {
    const { author, text } = req.body;
    const taskId = req.params.id;
    const now = Date.now();
    db.prepare(
      "INSERT INTO comments (taskId, author, text, createdAt) VALUES (?, ?, ?, ?)"
    ).run(taskId as string, author, text, now);
    db.prepare(
      "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
    ).run(taskId as string, "COMMENT_ADDED", JSON.stringify({ author }), now);
    res.json({ ok: true });
  });

  router.post("/:id/lock", (req, res) => {
    const { id } = req.params;
    const { agentId, ttlSeconds } = req.body;
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    const task = db
      .prepare("SELECT lockedBy, lockExpiresAt FROM tasks WHERE id = ?")
      .get(id as string) as Task | undefined;
    if (!task)
      return res.status(404).json({ error: { message: "Task not found" } });

    if (
      task.lockedBy &&
      task.lockedBy !== agentId &&
      (task.lockExpiresAt ?? 0) > now
    ) {
      return res
        .status(403)
        .json({ error: { message: `Task locked by ${task.lockedBy}` } });
    }

    db.prepare(
      "UPDATE tasks SET lockedBy = ?, lockExpiresAt = ?, updatedAt = ? WHERE id = ?"
    ).run(agentId, expiresAt, now, id as string);
    db.prepare(
      "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
    ).run(id as string, "LOCKED", JSON.stringify({ agentId, expiresAt }), now);

    res.json({ ok: true });
  });

  router.post("/:id/unlock", (req, res) => {
    const { id } = req.params;
    const { agentId } = req.body;
    const now = Date.now();

    const task = db
      .prepare("SELECT lockedBy FROM tasks WHERE id = ?")
      .get(id as string) as Task | undefined;
    if (!task)
      return res.status(404).json({ error: { message: "Task not found" } });

    if (task.lockedBy && task.lockedBy !== agentId && agentId !== "human") {
      return res
        .status(403)
        .json({ error: { message: "Not authorized to unlock" } });
    }

    db.prepare(
      "UPDATE tasks SET lockedBy = NULL, lockExpiresAt = NULL, updatedAt = ? WHERE id = ?"
    ).run(now, id as string);
    db.prepare(
      "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
    ).run(id as string, "UNLOCKED", JSON.stringify({ agentId }), now);

    res.json({ ok: true });
  });

  return router;
}
