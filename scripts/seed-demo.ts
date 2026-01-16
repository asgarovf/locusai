import { Database } from "bun:sqlite";
import { join } from "node:path";

const workspaceDir = join(process.cwd(), "demo.locus");
const db = new Database(join(workspaceDir, "db.sqlite"));

const now = Date.now();

const tasks = [
  {
    title: "Setup Monorepo Architecture",
    description:
      "Initialize the project with Bun workspaces and Biome for linting/formatting.",
    status: "DONE",
    labels: JSON.stringify(["infrastructure"]),
    assigneeRole: "engineer",
    acceptanceChecklist: JSON.stringify([
      { text: "Root package.json configured", completed: true },
      { text: "Apps and Packages folders created", completed: true },
    ]),
  },
  {
    title: "Implement User Authentication",
    description: "Add basic auth logic to the shared package and server.",
    status: "IN_PROGRESS",
    labels: JSON.stringify(["feature", "backend"]),
    assigneeRole: "engineer",
    acceptanceChecklist: JSON.stringify([
      { text: "Define User interface in shared", completed: true },
      { text: "Add /login endpoint to server", completed: false },
    ]),
  },
  {
    title: "Design Frontend Dashboard",
    description: "Create a mock UI for the analytics dashboard in the web app.",
    status: "BACKLOG",
    labels: JSON.stringify(["ui", "frontend"]),
    assigneeRole: "designer",
    acceptanceChecklist: "[]",
  },
  {
    title: "Configure Quality Gates",
    description: "Ensure that all commits pass the 'full' CI preset.",
    status: "REVIEW",
    labels: JSON.stringify(["ci"]),
    assigneeRole: "engineer",
    acceptanceChecklist: JSON.stringify([
      { text: "Linting checks passed", completed: true },
      { text: "Tests passed", completed: true },
    ]),
  },
];

for (const task of tasks) {
  db.prepare(`
    INSERT INTO tasks (title, description, status, labels, assigneeRole, acceptanceChecklist, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.title,
    task.description,
    task.status,
    task.labels,
    task.assigneeRole,
    task.acceptanceChecklist,
    now,
    now
  );
}

console.log("Seeded 4 tasks into demo.locus/db.sqlite");
db.close();
