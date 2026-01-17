import type { Database, SQLQueryBindings } from "bun:sqlite";
import { EventType, type Task, TaskSchema } from "@locus/shared";
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
        sprintId,
      } = req.body as z.infer<typeof TaskSchema>;
      const now = Date.now();
      const mandatoryChecklist = [
        { id: crypto.randomUUID(), text: "bun run lint", done: false },
        { id: crypto.randomUUID(), text: "bun run typecheck", done: false },
      ];

      const result = db
        .prepare(`
        INSERT INTO tasks (title, description, status, priority, labels, assigneeRole, parentId, sprintId, acceptanceChecklist, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          title,
          description,
          status,
          priority,
          JSON.stringify(labels),
          assigneeRole ?? null,
          parentId ?? null,
          sprintId ?? null,
          JSON.stringify(mandatoryChecklist),
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

    // Fetch related data
    const events = db
      .prepare("SELECT * FROM events WHERE taskId = ? ORDER BY createdAt DESC")
      .all(req.params.id) as {
      id: number;
      taskId: string;
      type: string;
      payload: string;
      createdAt: number;
    }[];

    const comments = db
      .prepare(
        "SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt DESC"
      )
      .all(req.params.id) as {
      id: number;
      taskId: string;
      author: string;
      text: string;
      createdAt: number;
    }[];

    const artifacts = db
      .prepare(
        "SELECT * FROM artifacts WHERE taskId = ? ORDER BY createdAt DESC"
      )
      .all(req.params.id) as {
      id: number;
      taskId: string;
      type: string;
      title: string;
      url: string;
      size: string;
      createdBy: string;
      createdAt: number;
    }[];

    const formattedTask: Task = {
      ...task,
      labels: JSON.parse(task.labels || "[]"),
      acceptanceChecklist: JSON.parse(task.acceptanceChecklist || "[]"),
      activityLog: events.map((e) => ({
        id: e.id,
        taskId: Number(e.taskId),
        type: e.type as EventType,
        payload: JSON.parse(e.payload || "{}"),
        createdAt: e.createdAt,
      })),
      comments: comments.map((c) => ({
        id: c.id,
        taskId: Number(c.taskId),
        author: c.author,
        text: c.text,
        createdAt: c.createdAt,
      })),
      artifacts: artifacts.map((a) => ({
        id: a.id,
        taskId: Number(a.taskId),
        type: a.type,
        title: a.title,
        url: a.url,
        size: a.size,
        createdBy: a.createdBy || "system",
        createdAt: a.createdAt,
      })),
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

    // Block direct transition to DONE - must go through VERIFICATION first
    if (updates.status === "DONE" && oldTask.status !== "VERIFICATION") {
      return res.status(400).json({
        error: {
          message:
            "Cannot move directly to DONE. Tasks must be in VERIFICATION first for human review.",
        },
      });
    }

    const fields = [];
    const vals: unknown[] = [];
    for (const [key, val] of Object.entries(updates)) {
      if (key === "sprintId") {
        fields.push("sprintId = ?");
        vals.push(val); // Ensure this is null or number
        continue;
      }
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
        JSON.stringify({
          oldStatus: oldTask.status,
          newStatus: updates.status,
        }),
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
    ).run(
      taskId as string,
      "COMMENT_ADDED",
      JSON.stringify({ author, text }),
      now
    );
    res.json({ ok: true });
  });

  // Atomic dispatch for agents
  router.post("/dispatch", (req, res) => {
    const { workerId, sprintId } = req.body;

    // Require sprintId - agents must work on active sprint only
    if (!sprintId) {
      return res.status(400).json({
        error: {
          message:
            "sprintId is required. Use kanban.next which automatically determines the active sprint.",
        },
      });
    }

    const now = Date.now();
    const expiresAt = now + 3600 * 1000; // 1 hour lock
    const agentName = workerId || `agent-${crypto.randomUUID().slice(0, 8)}`;

    try {
      // Transaction to ensure atomicity
      const task = db.transaction(() => {
        const numericSprintId = Number.parseInt(sprintId, 10);

        // Find best candidate - must match sprintId
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
        const params: SQLQueryBindings[] = [now, numericSprintId];

        const candidate = db.prepare(query).get(...params) as Task | undefined;

        if (!candidate) return null;

        // Lock it
        db.prepare(
          "UPDATE tasks SET lockedBy = ?, lockExpiresAt = ?, updatedAt = ? WHERE id = ?"
        ).run(agentName, expiresAt, now, candidate.id);

        db.prepare(
          "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
        ).run(
          candidate.id,
          "LOCKED",
          JSON.stringify({ agentId: agentName, expiresAt }),
          now
        );

        return {
          ...candidate,
          labels: JSON.parse((candidate.labels as unknown as string) || "[]"),
          acceptanceChecklist: JSON.parse(
            (candidate.acceptanceChecklist as unknown as string) || "[]"
          ),
        };
      })();

      if (!task) {
        return res.status(404).json({ message: "No tasks available" });
      }

      res.json(task);
    } catch (err: unknown) {
      console.error("Dispatch error:", err);
      res.status(500).json({ error: { message: "Failed to dispatch task" } });
    }
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
