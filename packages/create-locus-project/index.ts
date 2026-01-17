#!/usr/bin/env bun
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { initializeLocus, logMcpConfig } from "./src/generators/locus.js";
import { generateRootConfigs, setupStructure } from "./src/generators/root.js";
import { generateAppServer } from "./src/generators/server.js";
import { generatePackageShared } from "./src/generators/shared.js";
import { generateAppWeb } from "./src/generators/web.js";
import type { ProjectConfig } from "./src/types.js";

// --- CLI Argument Parsing ---

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    name: { type: "string" },
    path: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.name) {
  console.error(
    "Usage: bun create locus-project --name <project-name> [<directory>] [--path <directory>]"
  );
  process.exit(1);
}

const projectName = values.name;
const scopedName = `@${projectName}`;

const userPathInput = values.path || positionals[0];
let basePath = process.cwd();

if (userPathInput) {
  const userPath = userPathInput.startsWith("~")
    ? join(homedir(), userPathInput.slice(1))
    : userPathInput;
  basePath = isAbsolute(userPath) ? userPath : resolve(process.cwd(), userPath);
}

const projectPath = join(basePath, projectName);
const locusDir = join(projectPath, ".locus");

const config: ProjectConfig = {
  projectName,
  scopedName,
  projectPath,
  locusDir,
};

// --- Execution ---

async function run() {
  try {
    await setupStructure(config);
    await generateRootConfigs(config);
    await generatePackageShared(config);
    await generateAppWeb(config);
    await generateAppServer(config);
    await initializeLocus(config);
    await logMcpConfig(config);
  } catch (error) {
    console.error("Error creating project:", error);
    process.exit(1);
  }
}

run();
