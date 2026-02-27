#!/usr/bin/env node

/**
 * Locus V3 — GitHub-native AI engineering assistant.
 *
 * Entry point and command router.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isInitialized } from "./core/config.js";
import { getGitRoot, isGitRepo } from "./core/context.js";
import { initLogger } from "./core/logger.js";
import { getRateLimiter } from "./core/rate-limiter.js";
import { bold, cyan, dim, red } from "./display/terminal.js";
import type { LogLevel } from "./types.js";

// ─── Version ─────────────────────────────────────────────────────────────────

function getCliVersion(): string {
  const fallbackVersion = "0.0.0";
  const packageJsonPath = join(
    fileURLToPath(new URL(".", import.meta.url)),
    "..",
    "package.json"
  );

  if (!existsSync(packageJsonPath)) {
    return fallbackVersion;
  }

  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version?: string;
    };
    return parsed.version ?? fallbackVersion;
  } catch {
    return fallbackVersion;
  }
}

const VERSION = getCliVersion();

// ─── Argument Parsing ────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string;
  args: string[];
  flags: {
    debug: boolean;
    help: boolean;
    version: boolean;
    jsonStream: boolean;
    sessionId?: string;
    follow: boolean;
    level?: string;
    clean: boolean;
    lines?: number;
    resume: boolean;
    dryRun: boolean;
    model?: string;
    check: boolean;
    targetVersion?: string;
    installVersion?: string;
    upgrade: boolean;
    list: boolean;
    noSandbox: boolean;
    sandbox?: string;
  };
}

function parseArgs(argv: string[]): ParsedArgs {
  const rawArgs = argv.slice(2); // skip node + script

  const flags: ParsedArgs["flags"] = {
    debug: false,
    help: false,
    version: false,
    jsonStream: false,
    follow: false,
    clean: false,
    resume: false,
    dryRun: false,
    check: false,
    upgrade: false,
    list: false,
    noSandbox: false,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg === "--") {
      // Everything after -- is positional
      positional.push(...rawArgs.slice(i + 1));
      break;
    }

    switch (arg) {
      case "--debug":
      case "-d":
        flags.debug = true;
        break;
      case "--help":
      case "-h":
        flags.help = true;
        break;
      case "--version":
      case "-V": {
        // If the next token looks like a version number (starts with a digit),
        // treat it as a package version for `locus install`.  Otherwise show
        // the CLI version as usual.
        const nextToken = rawArgs[i + 1];
        if (nextToken !== undefined && /^\d/.test(nextToken)) {
          flags.installVersion = rawArgs[++i];
        } else {
          flags.version = true;
        }
        break;
      }
      case "-v":
        flags.installVersion = rawArgs[++i];
        break;
      case "--upgrade":
      case "-u":
        flags.upgrade = true;
        break;
      case "--list":
      case "-l":
        flags.list = true;
        break;
      case "--json-stream":
        flags.jsonStream = true;
        break;
      case "--session-id":
      case "-s":
        flags.sessionId = rawArgs[++i];
        break;
      case "--follow":
      case "-f":
        flags.follow = true;
        break;
      case "--level":
        flags.level = rawArgs[++i];
        break;
      case "--clean":
        flags.clean = true;
        break;
      case "--lines":
      case "-n":
        flags.lines = Number.parseInt(rawArgs[++i], 10);
        break;
      case "--resume":
        flags.resume = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--model":
      case "-m":
        flags.model = rawArgs[++i];
        break;
      case "--check":
        flags.check = true;
        break;
      case "--target-version":
        flags.targetVersion = rawArgs[++i];
        break;
      case "--no-sandbox":
        flags.noSandbox = true;
        break;
      default:
        // Handle --sandbox=<value> (e.g. --sandbox=require)
        if (arg.startsWith("--sandbox=")) {
          flags.sandbox = arg.slice("--sandbox=".length);
          break;
        }
        positional.push(arg);
    }
    i++;
  }

  const command = positional[0] ?? "";
  const args = positional.slice(1);

  return { command, args, flags };
}

// ─── Help ────────────────────────────────────────────────────────────────────

function printHelp(): void {
  process.stderr.write(`
${bold("Locus")} ${dim(`v${VERSION}`)} — GitHub-native AI engineering assistant

${bold("Usage:")}
  locus <command> [options]

${bold("Commands:")}
  ${cyan("init")}              Initialize Locus in a GitHub repository
  ${cyan("issue")} ${dim("(i)")}         Manage GitHub issues as work items
  ${cyan("sprint")} ${dim("(s)")}        Manage sprints via GitHub Milestones
  ${cyan("plan")}              AI-powered sprint planning
  ${cyan("run")}               Execute issues using AI agents
  ${cyan("exec")} ${dim("(e)")}          Interactive REPL / one-shot execution
  ${cyan("review")}            AI-powered code review on PRs
  ${cyan("iterate")}           Re-execute tasks with PR feedback
  ${cyan("discuss")}           AI-powered architectural discussions
  ${cyan("artifacts")}         View and manage AI-generated artifacts
  ${cyan("status")}            Dashboard view of current state
  ${cyan("config")}            View and manage settings
  ${cyan("logs")}              View, tail, and manage execution logs
  ${cyan("install")}           Install a community package
  ${cyan("uninstall")}         Remove an installed package
  ${cyan("packages")}          Manage installed packages (list, outdated)
  ${cyan("pkg")} ${dim("<name> [cmd]")}   Run a command from an installed package
  ${cyan("sandbox")}           Manage Docker sandbox lifecycle
  ${cyan("upgrade")}           Check for and install updates

${bold("Options:")}
  ${dim("--debug, -d")}        Enable debug logging
  ${dim("--help, -h")}         Show this help
  ${dim("--version, -V")}      Show version

${bold("Examples:")}
  locus init                          ${dim("# Set up Locus in this repo")}
  locus exec                          ${dim("# Start interactive REPL")}
  locus issue create "Fix login bug"  ${dim("# Create a new issue")}
  locus plan "Build auth system"      ${dim("# AI creates a plan file")}
  locus plan approve <id>             ${dim("# Create issues from saved plan")}
  locus run                           ${dim("# Execute active sprint")}
  locus run 42 43                     ${dim("# Run issues in parallel")}
  locus run 42 --no-sandbox           ${dim("# Run without sandbox")}
  locus run 42 --sandbox=require      ${dim("# Require Docker sandbox")}
  locus sandbox                       ${dim("# Create Docker sandbox")}
  locus sandbox claude                ${dim("# Login to Claude in sandbox")}

`);
}

// ─── Command Aliases ─────────────────────────────────────────────────────────

function resolveAlias(command: string): string {
  const aliases: Record<string, string> = {
    i: "issue",
    s: "sprint",
    e: "exec",
  };
  return aliases[command] ?? command;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);

  // Handle --version
  if (parsed.flags.version) {
    process.stdout.write(`${VERSION}\n`);
    process.exit(0);
  }

  // Handle --help with no command
  if (parsed.flags.help && !parsed.command) {
    printHelp();
    process.exit(0);
  }

  // Resolve command aliases
  const command = resolveAlias(parsed.command);

  // Determine working directory and log level
  const cwd = process.cwd();
  const logLevel: LogLevel = parsed.flags.debug
    ? "debug"
    : ((process.env.LOCUS_LOG_LEVEL as LogLevel) ?? "normal");

  // Initialize logger
  let logDir: string | undefined;
  if (isGitRepo(cwd)) {
    try {
      const root = getGitRoot(cwd);
      if (isInitialized(root)) {
        logDir = join(root, ".locus", "logs");
        // Initialize rate limiter for projects
        getRateLimiter(root);
      }
    } catch {
      // Not critical
    }
  }

  const logger = initLogger({
    level: logLevel,
    logDir: logLevel !== "silent" ? logDir : undefined,
  });

  logger.debug("CLI started", {
    command,
    args: parsed.args,
    version: VERSION,
    logLevel,
  });

  // Start non-blocking version check (24h cooldown, prints after command completes)
  // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op default
  let printVersionNotice = () => {};
  if (command !== "upgrade") {
    const { startVersionCheck } = await import("./core/version-check.js");
    printVersionNotice = startVersionCheck(VERSION);
  }

  // Commands that don't require initialization
  if (!command) {
    printHelp();
    process.exit(0);
  }

  if (command === "init") {
    const { initCommand } = await import("./commands/init.js");
    await initCommand(cwd);
    logger.destroy();
    return;
  }

  if (command === "install") {
    // `locus install --list` is a discoverability alias for `locus packages list`
    if (parsed.flags.list) {
      const { packagesCommand } = await import("./commands/packages.js");
      await packagesCommand(["list"], {});
      logger.destroy();
      return;
    }
    const { installCommand } = await import("./commands/install.js");
    const installFlags: Record<string, string> = {};
    if (parsed.flags.installVersion) {
      installFlags.version = parsed.flags.installVersion;
    }
    if (parsed.flags.upgrade) {
      installFlags.upgrade = "true";
    }
    await installCommand(parsed.args, installFlags);
    logger.destroy();
    return;
  }

  if (command === "uninstall") {
    const { uninstallCommand } = await import("./commands/uninstall.js");
    await uninstallCommand(parsed.args, {});
    logger.destroy();
    return;
  }

  if (command === "packages") {
    const { packagesCommand } = await import("./commands/packages.js");
    await packagesCommand(parsed.args, {});
    logger.destroy();
    return;
  }

  if (command === "pkg") {
    const { pkgCommand } = await import("./commands/pkg.js");
    await pkgCommand(parsed.args, {});
    logger.destroy();
    return;
  }

  // All other commands require initialization
  let projectRoot: string;
  try {
    projectRoot = getGitRoot(cwd);
  } catch {
    process.stderr.write(`${red("✗")} Not inside a git repository.\n`);
    process.exit(1);
  }

  if (!isInitialized(projectRoot)) {
    process.stderr.write(
      `${red("✗")} Locus is not initialized in this project.\n`
    );
    process.stderr.write(`  Run: ${bold("locus init")}\n`);
    process.exit(1);
  }

  // Route to command handler
  switch (command) {
    case "config": {
      const { configCommand } = await import("./commands/config.js");
      await configCommand(projectRoot, parsed.args);
      break;
    }

    case "logs": {
      const { logsCommand } = await import("./commands/logs.js");
      await logsCommand(projectRoot, {
        follow: parsed.flags.follow,
        level: parsed.flags.level as LogLevel | undefined,
        clean: parsed.flags.clean,
        lines: parsed.flags.lines,
      });
      break;
    }

    case "issue": {
      const { issueCommand } = await import("./commands/issue.js");
      const issueArgs = parsed.flags.help ? ["help"] : parsed.args;
      await issueCommand(projectRoot, issueArgs);
      break;
    }

    case "sprint": {
      const { sprintCommand } = await import("./commands/sprint.js");
      const sprintArgs = parsed.flags.help ? ["help"] : parsed.args;
      await sprintCommand(projectRoot, sprintArgs);
      break;
    }

    // ── Phase 3 commands ───────────────────────────────────────────────

    case "exec": {
      const { execCommand } = await import("./commands/exec.js");
      const execArgs = parsed.flags.help ? ["help"] : parsed.args;
      await execCommand(projectRoot, execArgs, {
        sessionId: parsed.flags.sessionId,
        jsonStream: parsed.flags.jsonStream,
      });
      break;
    }

    case "run": {
      const { runCommand } = await import("./commands/run.js");
      const runArgs = parsed.flags.help ? ["help"] : parsed.args;
      await runCommand(projectRoot, runArgs, {
        resume: parsed.flags.resume,
        dryRun: parsed.flags.dryRun,
        model: parsed.flags.model,
        sandbox: parsed.flags.sandbox,
        noSandbox: parsed.flags.noSandbox,
      });
      break;
    }

    // ── Phase 4 & 5 commands ──────────────────────────────────────────

    case "status": {
      const { statusCommand } = await import("./commands/status.js");
      await statusCommand(projectRoot);
      break;
    }

    case "plan": {
      const { planCommand } = await import("./commands/plan.js");
      const planArgs = parsed.flags.help ? ["help"] : parsed.args;
      await planCommand(projectRoot, planArgs, {
        dryRun: parsed.flags.dryRun,
        model: parsed.flags.model,
      });
      break;
    }

    case "review": {
      const { reviewCommand } = await import("./commands/review.js");
      const reviewArgs = parsed.flags.help ? ["help"] : parsed.args;
      await reviewCommand(projectRoot, reviewArgs, {
        dryRun: parsed.flags.dryRun,
        model: parsed.flags.model,
      });
      break;
    }

    case "iterate": {
      const { iterateCommand } = await import("./commands/iterate.js");
      const iterateArgs = parsed.flags.help ? ["help"] : parsed.args;
      await iterateCommand(projectRoot, iterateArgs, {
        dryRun: parsed.flags.dryRun,
        model: parsed.flags.model,
      });
      break;
    }

    case "discuss": {
      const { discussCommand } = await import("./commands/discuss.js");
      const discussArgs = parsed.flags.help ? ["help"] : parsed.args;
      await discussCommand(projectRoot, discussArgs, {
        model: parsed.flags.model,
      });
      break;
    }

    case "artifacts": {
      const { artifactsCommand } = await import("./commands/artifacts.js");
      const artifactsArgs = parsed.flags.help ? ["help"] : parsed.args;
      await artifactsCommand(projectRoot, artifactsArgs);
      break;
    }

    case "sandbox": {
      const { sandboxCommand } = await import("./commands/sandbox.js");
      const sandboxArgs = parsed.flags.help ? ["help"] : parsed.args;
      await sandboxCommand(projectRoot, sandboxArgs);
      break;
    }

    // ── Phase 7 commands ────────────────────────────────────────────────

    case "upgrade": {
      const { upgradeCommand } = await import("./commands/upgrade.js");
      await upgradeCommand(projectRoot, parsed.args, {
        check: parsed.flags.check,
        targetVersion: parsed.flags.targetVersion,
        currentVersion: VERSION,
      });
      break;
    }

    default:
      process.stderr.write(`${red("✗")} Unknown command: ${bold(command)}\n`);
      process.stderr.write(
        `  Run ${bold("locus --help")} for available commands.\n`
      );
      process.exit(1);
  }

  // Print version update notice (if available) after command completes
  printVersionNotice();

  logger.destroy();
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

main().catch((error) => {
  process.stderr.write(`\n${red("Fatal error:")} ${error.message}\n`);
  if (process.env.LOCUS_LOG_LEVEL === "debug") {
    process.stderr.write(`\n${dim(error.stack)}\n`);
  }
  process.exit(1);
});
