import type { Database } from "bun:sqlite";
import { Router } from "express";

export function createEventsRouter(db: Database) {
  const router = Router();

  router.get("/", (req, res) => {
    const taskId = req.query.taskId;
    const events = db
      .prepare("SELECT * FROM events WHERE taskId = ? ORDER BY createdAt DESC")
      .all(taskId as string) as { payload: string }[];

    const formattedEvents = events.map((e) => ({
      ...e,
      payload: JSON.parse(e.payload || "{}"),
    }));
    res.json(formattedEvents);
  });

  return router;
}
