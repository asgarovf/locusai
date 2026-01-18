import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    project: { type: "string" },
  },
  strict: false,
  allowPositionals: true,
});

// Accept --project flag or LOCUS_PROJECT_PATH environment variable
const projectPath = values.project || process.env.LOCUS_PROJECT_PATH;

if (!projectPath || typeof projectPath !== "string") {
  console.error("Usage: bun run mcp -- --project <workspaceDir>");
  console.error("Or set LOCUS_PROJECT_PATH environment variable");
  process.exit(1);
}

export const projectDir: string = projectPath;
export const API_BASE = "http://localhost:3080/api";
