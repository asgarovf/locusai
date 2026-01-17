import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { parseArgs } from "node:util";
import cors from "cors";
import express from "express";
import { ArtifactController } from "./controllers/artifact.controller.js";
import { CiController } from "./controllers/ci.controller.js";
import { DocController } from "./controllers/doc.controller.js";
import { EventController } from "./controllers/event.controller.js";
import { SprintController } from "./controllers/sprint.controller.js";
// Controllers
import { TaskController } from "./controllers/task.controller.js";
import { initDb } from "./db.js";
// Middleware
import { errorHandler } from "./middleware/error.middleware.js";
import { ArtifactRepository } from "./repositories/artifact.repository.js";
import { CommentRepository } from "./repositories/comment.repository.js";
import { EventRepository } from "./repositories/event.repository.js";
import { SprintRepository } from "./repositories/sprint.repository.js";
// Repositories
import { TaskRepository } from "./repositories/task.repository.js";
import { createArtifactsRouter } from "./routes/artifacts.routes.js";
import { createCiRouter } from "./routes/ci.routes.js";
import { createDocsRouter } from "./routes/docs.routes.js";
import { createEventsRouter } from "./routes/events.routes.js";
import { createSprintsRouter } from "./routes/sprints.routes.js";
// Routes
import { createTaskRouter } from "./routes/tasks.routes.js";
import { CiService } from "./services/ci.service.js";
import { SprintService } from "./services/sprint.service.js";
// Services
import { TaskService } from "./services/task.service.js";
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

// Initialize Repositories
const taskRepo = new TaskRepository(db);
const eventRepo = new EventRepository(db);
const commentRepo = new CommentRepository(db);
const artifactRepo = new ArtifactRepository(db);
const sprintRepo = new SprintRepository(db);

const processor = new TaskProcessor(db, {
  ciPresetsPath: config.ciPresetsPath,
  repoPath: workspaceDir,
});

// Initialize Services
const taskService = new TaskService(
  taskRepo,
  eventRepo,
  commentRepo,
  artifactRepo,
  processor
);
const sprintService = new SprintService(sprintRepo);
const ciService = new CiService(artifactRepo, eventRepo, {
  ciPresetsPath: config.ciPresetsPath,
  repoPath: workspaceDir,
});

// Initialize Controllers
const taskController = new TaskController(taskService);
const sprintController = new SprintController(sprintService);
const ciController = new CiController(ciService);
const artifactController = new ArtifactController(artifactRepo, workspaceDir);
const docController = new DocController({
  repoPath: config.repoPath,
  docsPath: config.docsPath,
});
const eventController = new EventController(eventRepo);

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Routes Implementation
app.use("/api/tasks", createTaskRouter(taskController));
app.use("/api/docs", createDocsRouter(docController));
app.use("/api/sprints", createSprintsRouter(sprintController));
app.use("/api/ci", createCiRouter(ciController));
app.use("/api/events", createEventsRouter(eventController));
app.use("/api", createArtifactsRouter(artifactController));

// Health Check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Error Handling
app.use(errorHandler);

const PORT = 3080;

// Serve Dashboard UI if it exists
const dashboardPaths = [
  join(import.meta.dir, "../public/dashboard"), // Production (bundled)
  join(process.cwd(), "packages/cli/public/dashboard"), // Dev (root)
];

const dashboardPath = dashboardPaths.find((p) => existsSync(p));

if (dashboardPath) {
  console.log(`Serving dashboard from ${dashboardPath}`);
  app.use(express.static(dashboardPath));
  // Client-side routing fallback
  app.get("/[^api]*", (_req, res) => {
    res.sendFile(join(dashboardPath, "index.html"));
  });
}

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
