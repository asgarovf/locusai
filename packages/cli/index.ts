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

  const projectNameInput = values.name;
  let projectPath: string;
  let projectName: string;
  const isNewProject = !!projectNameInput;

  if (isNewProject) {
    projectName = projectNameInput as string;
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
    projectPath = join(basePath, projectName);
  } else {
    projectPath = process.cwd();
    projectName = projectPath.split("/").pop() || "locus-project";
    console.log(`Initializing Locus in current directory: ${projectName}`);
  }

  const scopedName = `@${projectName}`;
  const locusDir = join(projectPath, ".locus");

  const config: ProjectConfig = {
    projectName,
    scopedName,
    projectPath,
    locusDir,
  };

  try {
    if (isNewProject) {
      await setupStructure(config);
      await generateRootConfigs(config);
      await generatePackageShared(config);
      await generateAppWeb(config);
      await generateAppServer(config);
    }

    await initializeLocus(config);
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

  const cliDir = import.meta.dir;
  const isBundled = cliDir.endsWith("/bin") || cliDir.endsWith("\\bin");
  const locusRoot = isBundled
    ? resolve(cliDir, "../")
    : resolve(cliDir, "../../");

  // Detection for bundled vs source mode
  const serverSourcePath = join(locusRoot, "apps/server/src/index.ts");
  const serverBundledPath = isBundled
    ? join(cliDir, "server.js")
    : join(locusRoot, "packages/cli/bin/server.js");

  const serverExecPath = existsSync(serverSourcePath)
    ? serverSourcePath
    : serverBundledPath;

  if (!existsSync(serverExecPath)) {
    console.error("Error: Locus engine not found. Please reinstall the CLI.");
    process.exit(1);
  }

  console.log("🚀 Starting Locus for project:", projectPath);

  const serverProcess = Bun.spawn(
    ["bun", "run", serverExecPath, "--project", locusDir],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  // Handle Dashboard
  let webProcess: ReturnType<typeof Bun.spawn> | undefined;
  const webSourceDir = join(locusRoot, "apps/web");

  if (existsSync(webSourceDir)) {
    // In dev mode, run Next.js dev server
    webProcess = Bun.spawn(["bun", "run", "dev"], {
      cwd: webSourceDir,
      stdout: "inherit",
      stderr: "inherit",
    });
  } else {
    // In production, the dashboard is served BY the server (coming soon)
    // or we tell the user to open the URL
    console.log("Dashboard UI: http://localhost:3081");
  }

  // Auto-open browser (macOS only for now)
  setTimeout(() => {
    try {
      if (process.platform === "darwin") {
        Bun.spawn(["open", "http://localhost:3080"], { stdout: "ignore" });
      }
    } catch {
      // Ignore open errors
    }
  }, 2000);

  // Handle shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down Locus...");
    serverProcess.kill();
    if (webProcess) webProcess.kill();
    process.exit();
  });

  await Promise.all([
    serverProcess.exited,
    webProcess ? webProcess.exited : Promise.resolve(),
  ]);
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
  locus init [--name <name>]  Create a new project or initialize in current dir
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
