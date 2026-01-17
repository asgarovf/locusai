#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { initializeLocus, logMcpConfig } from "./src/generators/locus.js";
import { generateRootConfigs, setupStructure } from "./src/generators/root.js";
import { generateAppServer } from "./src/generators/server.js";
import { generatePackageShared } from "./src/generators/shared.js";
import { generateAppWeb } from "./src/generators/web.js";
import type { ProjectConfig } from "./src/types.js";

async function init(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      name: { type: "string" },
      path: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });

  if (!values.name) {
    console.error(
      "Usage: locus init --name <project-name> [--path <directory>]"
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
    basePath = isAbsolute(userPath)
      ? userPath
      : resolve(process.cwd(), userPath);
  }

  const projectPath = join(basePath, projectName);
  const locusDir = join(projectPath, ".locus");

  const config: ProjectConfig = {
    projectName,
    scopedName,
    projectPath,
    locusDir,
  };

  try {
    await setupStructure(config);
    await generateRootConfigs(config);
    await generatePackageShared(config);
    await generateAppWeb(config);
    await generateAppServer(config);
    await initializeLocus(config);

    if (!existsSync(join(projectPath, ".git"))) {
      console.log("Initializing git repository...");
      await Bun.spawn(["git", "init"], { cwd: projectPath, stdout: "ignore" })
        .exited;
    }

    console.log("Formatting project...");
    await Bun.spawn(["bun", "run", "format"], {
      cwd: projectPath,
      stdout: "ignore",
    }).exited;

    await logMcpConfig(config);
  } catch (error) {
    console.error("Error creating project:", error);
    process.exit(1);
  }
}

async function dev(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: "string" },
    },
    strict: false,
  });

  const projectPath = (values.project as string) || process.cwd();
  const locusDir = isAbsolute(projectPath)
    ? join(projectPath, ".locus")
    : resolve(process.cwd(), projectPath, ".locus");

  if (!existsSync(locusDir)) {
    console.error(`Error: .locus directory not found at ${locusDir}`);
    console.log("Are you in a Locus project?");
    process.exit(1);
  }

  // Find the Locus source root to run the server and web app
  // In development, it's relative to this file
  const cliDir = import.meta.dir;
  const locusRoot = resolve(cliDir, "../../");

  console.log("🚀 Starting Locus for project:", projectPath);

  const serverProcess = Bun.spawn(
    [
      "bun",
      "run",
      join(locusRoot, "apps/server/src/index.ts"),
      "--project",
      locusDir,
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  const webProcess = Bun.spawn(["bun", "run", "dev"], {
    cwd: join(locusRoot, "apps/web"),
    stdout: "inherit",
    stderr: "inherit",
  });

  // Handle shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down Locus...");
    serverProcess.kill();
    webProcess.kill();
    process.exit();
  });

  await Promise.all([serverProcess.exited, webProcess.exited]);
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "init":
      await init(args);
      break;
    case "dev":
      await dev(args);
      break;
    case "help":
    case undefined:
      console.log(`
Locus CLI - Agentic Engineering Workspace

Usage:
  locus init --name <name>    Create a new Locus project
  locus dev                 Start Locus for the current project
  locus help                Show this help
      `);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
