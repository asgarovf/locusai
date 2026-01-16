import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  ArtifactSchema,
  CiRunSchema,
  type Comment,
  CommentSchema,
  DocWriteSchema,
  LockSchema,
  type Task,
  TaskSchema,
  TaskStatus,
  TaskUpdateSchema,
  UnlockSchema,
} from "@locus/shared";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    project: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.project) {
  console.error("Usage: bun run dev -- --project <workspaceDir>");
  process.exit(1);
}

const workspaceDir = isAbsolute(values.project)
  ? values.project
  : join(process.cwd(), values.project);
const configPath = join(workspaceDir, "workspace.config.json");
const config = JSON.parse(readFileSync(configPath, "utf-8"));

const db = new Database(join(workspaceDir, "db.sqlite"));
const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

import type { ZodSchema } from "zod";

// Helper to validate Zod schemas in middleware
const validate =
  (schema: ZodSchema, part: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return res.status(400).json({
        error: { message: "Validation failed", details: result.error.errors },
      });
    }
    req[part] = result.data;
    next();
  };

app.get("/health", (_req, res) => res.json({ status: "ok" }));

interface DocNode {
  type: "file" | "directory";
  name: string;
  path: string;
  children?: DocNode[];
}

app.get("/api/docs/tree", async (_req, res) => {
  // Simple scan of docs folder
  const scan = async (dir: string): Promise<DocNode[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(dir, entry.name);
      const relativePath = fullPath
        .replace(config.docsPath, "")
        .replace(/^\//, "");
      if (entry.isDirectory()) {
        results.push({
          type: "directory",
          name: entry.name,
          path: relativePath,
          children: await scan(fullPath),
        } as DocNode);
      } else {
        results.push({
          type: "file",
          name: entry.name,
          path: relativePath,
        } as DocNode);
      }
    }
    return results;
  };
  try {
    const tree = await scan(config.docsPath);
    res.json(tree);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: { message } });
  }
});

app.get("/api/docs/read", async (req, res) => {
  const docPath = req.query.path as string;
  const fullPath = resolve(config.docsPath, docPath);
  if (!fullPath.startsWith(config.docsPath))
    return res.status(403).json({ error: { message: "Access denied" } });
  try {
    const content = readFileSync(fullPath, "utf-8");
    res.json({ content });
  } catch (_err: unknown) {
    res.status(404).json({ error: { message: "File not found" } });
  }
});

app.post("/api/docs/write", validate(DocWriteSchema), async (req, res) => {
  const { path: docPath, content } = req.body;
  const fullPath = resolve(config.docsPath, docPath);
  if (!fullPath.startsWith(config.docsPath))
    return res.status(403).json({ error: { message: "Access denied" } });
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content);
  res.json({ ok: true });
});

// Tasks Endpoints
app.get("/api/tasks", (_req, res) => {
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

app.post("/api/tasks", validate(TaskSchema), (req, res) => {
  const { title, description, labels, assigneeRole } = req.body;
  const now = Date.now();
  const result = db
    .prepare(`
    INSERT INTO tasks (title, description, status, labels, assigneeRole, acceptanceChecklist, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .run(
      title,
      description,
      TaskStatus.BACKLOG,
      JSON.stringify(labels),
      assigneeRole,
      "[]",
      now,
      now
    );

  const taskId = result.lastInsertRowid;
  db.prepare(
    "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
  ).run(String(taskId), "TASK_CREATED", JSON.stringify({ title }), now);

  res.json({ id: taskId });
});

app.get("/api/tasks/:id", (req, res) => {
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

app.patch("/api/tasks/:id", validate(TaskUpdateSchema), (req, res) => {
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
  }

  res.json({ ok: true });
});

app.post("/api/tasks/:id/comment", validate(CommentSchema), (req, res) => {
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

app.get("/api/events", (req, res) => {
  const taskId = req.query.taskId;
  const events = db
    .prepare("SELECT * FROM events WHERE taskId = ? ORDER BY createdAt DESC")
    .all(taskId as string) as (Comment & { payload: string })[];

  const formattedEvents = events.map((e) => ({
    ...e,
    payload: JSON.parse(e.payload || "{}"),
  }));
  res.json(formattedEvents);
});

// Locks
app.post("/api/tasks/:id/lock", validate(LockSchema), (req, res) => {
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

app.post("/api/tasks/:id/unlock", validate(UnlockSchema), (req, res) => {
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

// Artifacts
app.post(
  "/api/tasks/:id/artifact",
  validate(ArtifactSchema),
  async (req, res) => {
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
  }
);

app.get("/api/tasks/:id/artifacts", (req, res) => {
  const artifacts = db
    .prepare("SELECT * FROM artifacts WHERE taskId = ? ORDER BY createdAt DESC")
    .all(req.params.id);
  res.json(artifacts);
});

// CI Runner
app.post("/api/ci/run", validate(CiRunSchema), async (req, res) => {
  const { taskId, preset } = req.body;
  const presets = JSON.parse(readFileSync(config.ciPresetsPath, "utf-8"));
  const commands = presets[preset];
  if (!commands)
    return res
      .status(400)
      .json({ error: { message: `Preset ${preset} not found` } });

  const results = [];
  let allOk = true;
  let combinedOutput = "";

  for (const cmd of commands) {
    const start = Date.now();
    try {
      // Security check
      if (/[;&|><$`\n]/.test(cmd)) throw new Error("Invalid command");

      const proc = Bun.spawn(cmd.split(" "), {
        cwd: config.repoPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      const duration = Date.now() - start;
      results.push({ cmd, exitCode, durationMs: duration });
      combinedOutput += `\n> ${cmd}\n${stdout}${stderr}\n`;
      if (exitCode !== 0) allOk = false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ cmd, exitCode: -1, error: message });
      allOk = false;
      combinedOutput += `\n> ${cmd}\nError: ${message}\n`;
    }
  }

  const summary = allOk ? "All checks passed" : "Some checks failed";
  const now = Date.now();

  // Save as CI_OUTPUT artifact
  db.prepare(`
    INSERT INTO artifacts (taskId, type, title, contentText, createdBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    "CI_OUTPUT",
    `CI Run: ${preset}`,
    combinedOutput,
    "system",
    now
  );

  db.prepare(
    "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
  ).run(
    taskId as string,
    "CI_RAN",
    JSON.stringify({ preset, ok: allOk, summary }),
    now
  );

  res.json({ ok: allOk, preset, commands: results, summary });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { message: err.message } });
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
