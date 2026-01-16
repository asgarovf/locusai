import type { Database } from "bun:sqlite";
import { join } from "node:path";
import { Router } from "express";

export function createArtifactsRouter(db: Database, workspaceDir: string) {
  const router = Router();

  router.post("/tasks/:id/artifact", async (req, res) => {
    const { id: taskId } = req.params;
    const { type, title, contentText, fileBase64, fileName, createdBy } =
      req.body;
    const now = Date.now();

    let filePath = null;
    if (fileBase64 && fileName) {
      const { writeFile, mkdir } = await import("node:fs/promises");
      const dir = join(workspaceDir, "artifacts", taskId.toString());
      await mkdir(dir, { recursive: true });
      filePath = join(dir, `${now}-${fileName}`);
      await writeFile(filePath, Buffer.from(fileBase64, "base64"));
      // Store relative path
      filePath = filePath.replace(workspaceDir, "").replace(/^\//, "");
    }

    const result = db
      .prepare(`
    INSERT INTO artifacts (taskId, type, title, contentText, filePath, createdBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
      .run(
        taskId as string,
        type,
        title,
        contentText,
        filePath,
        createdBy,
        now
      );

    db.prepare(
      "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
    ).run(
      taskId as string,
      "ARTIFACT_ADDED",
      JSON.stringify({ type, title, createdBy }),
      now
    );

    res.json({ id: result.lastInsertRowid });
  });

  router.get("/artifacts", (req, res) => {
    const taskId = req.query.taskId;
    if (taskId) {
      const artifacts = db
        .prepare(
          "SELECT * FROM artifacts WHERE taskId = ? ORDER BY createdAt DESC"
        )
        .all(String(taskId));
      return res.json(artifacts);
    }
    const artifacts = db
      .prepare("SELECT * FROM artifacts ORDER BY createdAt DESC")
      .all();
    res.json(artifacts);
  });

  router.get("/artifacts/:id", (req, res) => {
    const artifact = db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(req.params.id);
    if (!artifact) return res.status(404).json({ error: "Artifact not found" });
    res.json(artifact);
  });

  router.get("/tasks/:id/artifacts", (req, res) => {
    const artifacts = db
      .prepare(
        "SELECT * FROM artifacts WHERE taskId = ? ORDER BY createdAt DESC"
      )
      .all(req.params.id);
    res.json(artifacts);
  });

  return router;
}
