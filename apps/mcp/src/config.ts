import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    project: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.project) {
  console.error("Usage: bun run mcp -- --project <workspaceDir>");
  process.exit(1);
}

export const projectDir = values.project;
export const API_BASE = "http://localhost:3080/api";
