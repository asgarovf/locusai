import { Database, type SQLQueryBindings } from "bun:sqlite";
import { SprintStatus } from "@locus/shared";
import { Router } from "express";

export function createSprintsRouter(db: Database) {
  const router = Router();

  // Get all sprints
  router.get("/", (_req, res) => {
    try {
      const sprints = db
        .prepare("SELECT * FROM sprints ORDER BY createdAt DESC")
        .all();
      res.json(sprints);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: { message } });
    }
  });

  // Create sprint
  router.post("/", (req, res) => {
    try {
      const { name, startDate, endDate } = req.body;
      const now = Date.now();

      const result = db
        .prepare(
          "INSERT INTO sprints (name, status, startDate, endDate, createdAt) VALUES (?, ?, ?, ?, ?)"
        )
        .run(
          name,
          SprintStatus.PLANNED,
          startDate || null,
          endDate || null,
          now
        );

      res.json({ id: result.lastInsertRowid });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: { message } });
    }
  });

  // Update sprint (e.g. start/complete)
  router.patch("/:id", (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // If setting status to ACTIVE, ensure no other active sprints (simplified logic)
      if (updates.status === SprintStatus.ACTIVE) {
        const activeSprint = db
          .prepare("SELECT id FROM sprints WHERE status = ? AND id != ?")
          .get(SprintStatus.ACTIVE, id);
        if (activeSprint) {
          return res
            .status(400)
            .json({ error: { message: "Another sprint is already active" } });
        }
      }

      const fields = [];
      const vals: unknown[] = [];
      for (const [key, val] of Object.entries(updates)) {
        fields.push(`${key} = ?`);
        vals.push(val);
      }

      if (fields.length === 0) return res.json({ ok: true });
      vals.push(id);

      db.prepare(`UPDATE sprints SET ${fields.join(", ")} WHERE id = ?`).run(
        ...(vals as SQLQueryBindings[])
      );
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: { message } });
    }
  });

  // Delete sprint and its tasks
  router.delete("/:id", (req, res) => {
    try {
      const sprintId = req.params.id;
      // Delete all tasks in this sprint
      db.prepare("DELETE FROM tasks WHERE sprintId = ?").run(sprintId);
      // Delete the sprint
      db.prepare("DELETE FROM sprints WHERE id = ?").run(sprintId);
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: { message } });
    }
  });

  return router;
}
