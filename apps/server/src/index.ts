import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { parseArgs } from "node:util";
import cors from "cors";
import express from "express";

import { initDb } from "./db.js";
import { createArtifactsRouter } from "./routes/artifacts.routes.js";
import { createCiRouter } from "./routes/ci.routes.js";
import { createDocsRouter } from "./routes/docs.routes.js";
import { createEventsRouter } from "./routes/events.routes.js";
import { createTaskRouter } from "./routes/tasks.routes.js";
import { TaskProcessor } from "./task-processor.js";

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

const db = initDb(workspaceDir);
const processor = new TaskProcessor(db, {
  ciPresetsPath: config.ciPresetsPath,
  repoPath: workspaceDir,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Routes
app.use("/api/tasks", createTaskRouter(db, processor));
app.use("/api/docs", createDocsRouter(config));
app.use("/api", createArtifactsRouter(db, workspaceDir));
app.use("/api/events", createEventsRouter(db));
app.use(
  "/api/ci",
  createCiRouter(db, {
    ciPresetsPath: config.ciPresetsPath,
    repoPath: workspaceDir,
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Server Error:", err);
    res.status(500).json({
      error: {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
    });
  }
);

const PORT = 3080;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
