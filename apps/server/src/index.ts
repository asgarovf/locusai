/**
 * Locus Backend Server
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import cors from "cors";
import express from "express";

// Auth
import { AuthService } from "./auth/auth.service.js";
// Controllers
import {
  ApiKeyController,
  ArtifactController,
  AuthController,
  CiController,
  DocController,
  EventController,
  OrganizationController,
  ProjectController,
  SprintController,
  TaskController,
} from "./controllers/index.js";
// Database
import { createSqliteDb, runMigrations } from "./db/index.js";
// Workspace Helpers
import { resolveWorkspace } from "./lib/workspace.js";
// Middleware
import { errorHandler, flexAuth, localAuth } from "./middleware/index.js";
// Repositories
import {
  ApiKeyRepository,
  ArtifactRepository,
  CommentRepository,
  DocumentRepository,
  EventRepository,
  MembershipRepository,
  OrganizationRepository,
  ProjectRepository,
  SprintRepository,
  TaskRepository,
} from "./repositories/index.js";
// Routes
import {
  createApiKeyRouter,
  createArtifactsRouter,
  createAuthRouter,
  createCiRouter,
  createDocsRouter,
  createEventsRouter,
  createOrganizationRouter,
  createProjectRouter,
  createSprintsRouter,
  createTaskRouter,
} from "./routes/index.js";
// Services
import {
  ApiKeyService,
  ArtifactService,
  CiService,
  DocService,
  EventService,
  OrganizationService,
  ProjectService,
  SprintService,
  TaskService,
} from "./services/index.js";
// Background Processor
import { TaskProcessor } from "./task-processor.js";

// ============================================================================
// Initialization Logic
// ============================================================================

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    project: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

const isCloud = process.env.DB_MODE === "cloud";
const connectionString = process.env.DATABASE_URL;

// biome-ignore lint/suspicious/noExplicitAny: Dynamic setup
let db: any;
let workspaceDir: string;
let repoDir: string;
// biome-ignore lint/suspicious/noExplicitAny: Dynamic config
let config: any;

if (isCloud) {
  if (!connectionString) {
    console.error("Error: DATABASE_URL is required in cloud mode");
    process.exit(1);
  }
  console.log("Connecting to Cloud Database (PostgreSQL)...");
  const { createPostgresDb } = await import("./db/drizzle.js");
  db = createPostgresDb(connectionString);
  workspaceDir = process.cwd();
  repoDir = "REMOTE";
  config = {
    ciPresetsPath: join(process.cwd(), "ci-presets.json"),
    docsPath: join(process.cwd(), "docs"),
  };
} else {
  const ws = resolveWorkspace(values.project);
  workspaceDir = ws.workspaceDir;
  repoDir = ws.repoDir;
  config = ws.config;
  db = createSqliteDb(ws.dbPath);

  // Run migrations (SQLite only for now, Cloud migrations should be manual or separate)
  runMigrations(db);
}

// ============================================================================
// Dependency Injection
// ============================================================================

// Repositories
const taskRepo = new TaskRepository(db);
const eventRepo = new EventRepository(db);
const commentRepo = new CommentRepository(db);
const artifactRepo = new ArtifactRepository(db);
const sprintRepo = new SprintRepository(db);
const projectRepo = new ProjectRepository(db);
const orgRepo = new OrganizationRepository(db);
const membershipRepo = new MembershipRepository(db);
const apiKeyRepo = new ApiKeyRepository(db);
const documentRepo = new DocumentRepository(db);

// Services
const sprintService = new SprintService(sprintRepo);
const projectService = new ProjectService(projectRepo);
const orgService = new OrganizationService(orgRepo, membershipRepo);
const apiKeyService = new ApiKeyService(apiKeyRepo);
const ciService = new CiService(artifactRepo, eventRepo);

// Background Processor (depends on CiService)
const processor = new TaskProcessor(taskRepo, eventRepo, artifactRepo);

// Task Service (depends on processor)
const taskService = new TaskService(
  taskRepo,
  eventRepo,
  commentRepo,
  artifactRepo,
  processor
);

const artifactService = new ArtifactService(artifactRepo);
const docService = isCloud
  ? new DocService(documentRepo)
  : new DocService({
      repoPath: repoDir,
      docsPath: config.docsPath || join(workspaceDir, "docs"),
    });
const eventService = new EventService(eventRepo);

const jwtSecret = process.env.JWT_SECRET || "locus-dev-secret-change-me";
const authService = new AuthService(db, { jwtSecret });
const authMiddlewareConfig = {
  jwtSecret,
  authService,
};

// Controllers
const authController = new AuthController(authService);
const apiKeyController = new ApiKeyController(
  apiKeyService,
  projectService,
  orgService
);
const taskController = new TaskController(
  taskService,
  projectService,
  orgService
);
const sprintController = new SprintController(
  sprintService,
  projectService,
  orgService
);
const projectController = new ProjectController(projectService, orgService);
const orgController = new OrganizationController(orgService);
const ciController = new CiController(ciService, projectService, orgService);
const artifactController = new ArtifactController(
  artifactService,
  taskService,
  projectService,
  orgService
);
const docController = new DocController(
  docService,
  isCloud,
  projectService,
  orgService
);
const eventController = new EventController(
  eventService,
  taskService,
  projectService,
  orgService
);

// ============================================================================
// App Configuration & Routes
// ============================================================================

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Use localAuth for local development (no auth required)
// Use flexAuth for cloud mode (requires JWT or API key)
const apiAuth = isCloud ? flexAuth(authMiddlewareConfig) : localAuth();

// Routes
app.use(
  "/api/auth",
  createAuthRouter({ controller: authController, authMiddlewareConfig })
);

// Protected routes
app.use("/api/tasks", apiAuth, createTaskRouter(taskController));
app.use("/api/projects", apiAuth, createProjectRouter(projectController));
app.use("/api/organizations", apiAuth, createOrganizationRouter(orgController));
app.use("/api/docs", apiAuth, createDocsRouter(docController));
app.use("/api/sprints", apiAuth, createSprintsRouter(sprintController));
app.use("/api/ci", apiAuth, createCiRouter(ciController));
app.use("/api/events", apiAuth, createEventsRouter(eventController));
app.use("/api/artifacts", apiAuth, createArtifactsRouter(artifactController));
app.use("/api/api-keys", apiAuth, createApiKeyRouter(apiKeyController));

// Health Check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Error Handling (Must be last)
app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

const PORT = process.env.PORT || 3080;

// Serve Dashboard UI if it exists
const dashboardPaths = [
  join(import.meta.dir, "../public/dashboard"), // Production (bundled)
  join(process.cwd(), "packages/cli/public/dashboard"), // Dev (root)
  join(process.cwd(), "apps/server/public/dashboard"), // Local dev
];

const dashboardPath = dashboardPaths.find((p) => existsSync(p));

if (dashboardPath) {
  console.log(`Serving dashboard from ${dashboardPath}`);
  app.use(express.static(dashboardPath));
  // Client-side routing fallback (must be after all other routes)
  app.get("*", (_req, res) => {
    res.sendFile(join(dashboardPath, "index.html"));
  });
}

const server = app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

// Graceful shutdown
const shutdown = () => {
  console.log("Shutting down...");
  server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
