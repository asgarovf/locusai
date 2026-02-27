/**
 * `locus sandbox` — Manage Docker sandbox lifecycle.
 *
 * Usage:
 *   locus sandbox                    # Create a persistent sandbox and enable sandbox mode
 *   locus sandbox claude             # Run claude interactively in the sandbox (for login)
 *   locus sandbox codex              # Run codex interactively in the sandbox (for login)
 *   locus sandbox rm                 # Destroy the sandbox and disable sandbox mode
 *   locus sandbox status             # Show current sandbox state
 */

import { execSync, spawn } from "node:child_process";
import { loadConfig, saveConfig } from "../core/config.js";
import { detectSandboxSupport } from "../core/sandbox.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";

// ─── Help ────────────────────────────────────────────────────────────────────

function printSandboxHelp(): void {
  process.stderr.write(`
${bold("locus sandbox")} — Manage Docker sandbox lifecycle

${bold("Usage:")}
  locus sandbox                     ${dim("# Create sandbox and enable sandbox mode")}
  locus sandbox claude              ${dim("# Run claude interactively (for login)")}
  locus sandbox codex               ${dim("# Run codex interactively (for login)")}
  locus sandbox rm                  ${dim("# Destroy sandbox and disable sandbox mode")}
  locus sandbox status              ${dim("# Show current sandbox state")}

${bold("Flow:")}
  1. ${cyan("locus sandbox")}          Create the sandbox environment
  2. ${cyan("locus sandbox claude")}   Login to Claude inside the sandbox
  3. ${cyan("locus exec")}             All commands now run inside the sandbox

`);
}

// ─── Command ─────────────────────────────────────────────────────────────────

export async function sandboxCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const subcommand = args[0] ?? "";

  switch (subcommand) {
    case "help":
      printSandboxHelp();
      return;
    case "claude":
    case "codex":
      return handleAgentLogin(projectRoot, subcommand);
    case "rm":
      return handleRemove(projectRoot);
    case "status":
      return handleStatus(projectRoot);
    case "":
      return handleCreate(projectRoot);
    default:
      process.stderr.write(
        `${red("✗")} Unknown sandbox subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Available: ${cyan("claude")}, ${cyan("codex")}, ${cyan("rm")}, ${cyan("status")}\n`
      );
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

async function handleCreate(projectRoot: string): Promise<void> {
  const config = loadConfig(projectRoot);

  // Check if there's already a sandbox
  if (config.sandbox.name) {
    const alive = isSandboxAlive(config.sandbox.name);
    if (alive) {
      process.stderr.write(
        `${green("✓")} Sandbox already exists: ${bold(config.sandbox.name)}\n`
      );
      process.stderr.write(
        `  Run ${cyan("locus sandbox claude")} or ${cyan("locus sandbox codex")} to login.\n`
      );
      return;
    }
    // Sandbox name exists in config but the actual sandbox is gone — clean up
    process.stderr.write(
      `${yellow("⚠")} Previous sandbox ${dim(config.sandbox.name)} is no longer running. Creating a new one.\n`
    );
  }

  // Check Docker sandbox support
  const status = await detectSandboxSupport();
  if (!status.available) {
    process.stderr.write(
      `${red("✗")} Docker sandbox not available: ${status.reason}\n`
    );
    process.stderr.write(
      `  Install Docker Desktop 4.58+ with sandbox support.\n`
    );
    return;
  }

  // Reserve a sandbox name — the actual Docker sandbox is created by
  // `locus sandbox claude/codex` which uses `docker sandbox run` with
  // the workspace path so files are properly synced into the VM.
  const segment = projectRoot.split("/").pop() ?? "sandbox";
  const sandboxName = `locus-${segment}-${Date.now()}`;

  config.sandbox.enabled = true;
  config.sandbox.name = sandboxName;
  saveConfig(projectRoot, config);

  process.stderr.write(
    `${green("✓")} Sandbox name reserved: ${bold(sandboxName)}\n`
  );
  process.stderr.write(
    `  Next: run ${cyan("locus sandbox claude")} or ${cyan("locus sandbox codex")} to create the sandbox and login.\n`
  );
}

// ─── Agent Login ─────────────────────────────────────────────────────────────

async function handleAgentLogin(
  projectRoot: string,
  agent: "claude" | "codex"
): Promise<void> {
  const config = loadConfig(projectRoot);

  // Auto-create sandbox name if user went straight to `locus sandbox claude`
  if (!config.sandbox.name) {
    const status = await detectSandboxSupport();
    if (!status.available) {
      process.stderr.write(
        `${red("✗")} Docker sandbox not available: ${status.reason}\n`
      );
      process.stderr.write(
        `  Install Docker Desktop 4.58+ with sandbox support.\n`
      );
      return;
    }

    const segment = projectRoot.split("/").pop() ?? "sandbox";
    config.sandbox.name = `locus-${segment}-${Date.now()}`;
    config.sandbox.enabled = true;
    saveConfig(projectRoot, config);
  }

  const sandboxName = config.sandbox.name;
  const alive = isSandboxAlive(sandboxName);

  let dockerArgs: string[];

  if (alive) {
    // Sandbox already exists — exec into it
    if (agent === "codex") {
      await ensureCodexInSandbox(sandboxName);
    }
    process.stderr.write(`Connecting to sandbox ${dim(sandboxName)}...\n`);
    process.stderr.write(`${dim("Login and then exit when ready.")}\n\n`);
    dockerArgs = [
      "sandbox",
      "exec",
      "-it",
      "-w",
      projectRoot,
      sandboxName,
      agent,
    ];
  } else if (agent === "codex") {
    // Codex: Docker sandbox only ships with `claude` pre-installed.
    // Create the sandbox with `claude` as the base agent, then install codex.
    process.stderr.write(
      `Creating sandbox ${bold(sandboxName)} with workspace ${dim(projectRoot)}...\n`
    );

    try {
      execSync(
        `docker sandbox run --name ${sandboxName} claude ${projectRoot} -- --version`,
        { stdio: ["pipe", "pipe", "pipe"], timeout: 120_000 }
      );
    } catch {
      // claude --version exits quickly; non-zero exit is OK as long as sandbox was created
    }

    if (!isSandboxAlive(sandboxName)) {
      process.stderr.write(`${red("✗")} Failed to create sandbox.\n`);
      return;
    }

    await ensureCodexInSandbox(sandboxName);

    process.stderr.write(`${dim("Login and then exit when ready.")}\n\n`);
    dockerArgs = [
      "sandbox",
      "exec",
      "-it",
      "-w",
      projectRoot,
      sandboxName,
      "codex",
    ];
  } else {
    // Claude: create sandbox interactively (existing behavior)
    process.stderr.write(
      `Creating sandbox ${bold(sandboxName)} with workspace ${dim(projectRoot)}...\n`
    );
    process.stderr.write(`${dim("Login and then exit when ready.")}\n\n`);
    dockerArgs = ["sandbox", "run", "--name", sandboxName, agent, projectRoot];
  }

  const child = spawn("docker", dockerArgs, {
    stdio: "inherit", // Forward stdin/stdout/stderr for interactive login
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (code) => {
      // Enforce .sandboxignore after login to remove sensitive files
      // before any subsequent agent exec calls.
      await enforceSandboxIgnore(sandboxName, projectRoot);

      if (code === 0) {
        process.stderr.write(
          `\n${green("✓")} ${agent} session ended. Auth should now be persisted in the sandbox.\n`
        );
      } else {
        process.stderr.write(
          `\n${yellow("⚠")} ${agent} exited with code ${code}.\n`
        );
      }
      resolve();
    });
    child.on("error", (err) => {
      process.stderr.write(
        `${red("✗")} Failed to start ${agent}: ${err.message}\n`
      );
      resolve();
    });
  });
}

// ─── Remove ──────────────────────────────────────────────────────────────────

function handleRemove(projectRoot: string): void {
  const config = loadConfig(projectRoot);

  if (!config.sandbox.name) {
    process.stderr.write(`${dim("No sandbox to remove.")}\n`);
    return;
  }

  const sandboxName = config.sandbox.name;
  process.stderr.write(`Removing sandbox ${bold(sandboxName)}...\n`);

  try {
    execSync(`docker sandbox rm ${sandboxName}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
    });
  } catch {
    // May already be removed
  }

  // Update config
  config.sandbox.name = undefined;
  config.sandbox.enabled = false;
  saveConfig(projectRoot, config);

  process.stderr.write(
    `${green("✓")} Sandbox removed. Sandbox mode disabled.\n`
  );
}

// ─── Status ──────────────────────────────────────────────────────────────────

function handleStatus(projectRoot: string): void {
  const config = loadConfig(projectRoot);

  process.stderr.write(`\n${bold("Sandbox Status")}\n\n`);
  process.stderr.write(
    `  ${dim("Enabled:")}  ${config.sandbox.enabled ? green("yes") : red("no")}\n`
  );
  process.stderr.write(
    `  ${dim("Name:")}     ${config.sandbox.name ? bold(config.sandbox.name) : dim("(none)")}\n`
  );

  if (config.sandbox.name) {
    const alive = isSandboxAlive(config.sandbox.name);
    process.stderr.write(
      `  ${dim("Running:")}  ${alive ? green("yes") : red("no")}\n`
    );

    if (!alive) {
      process.stderr.write(
        `\n  ${yellow("⚠")} Sandbox is not running. Run ${bold("locus sandbox")} to create a new one.\n`
      );
    }
  }

  process.stderr.write("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ensure the `codex` CLI is installed inside the sandbox.
 * Docker sandbox only ships with `claude` pre-installed.
 */
async function ensureCodexInSandbox(sandboxName: string): Promise<void> {
  try {
    execSync(`docker sandbox exec ${sandboxName} which codex`, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
  } catch {
    process.stderr.write(`Installing codex in sandbox...\n`);
    try {
      execSync(
        `docker sandbox exec ${sandboxName} npm install -g @openai/codex`,
        { stdio: "inherit", timeout: 120_000 }
      );
    } catch {
      process.stderr.write(`${red("✗")} Failed to install codex in sandbox.\n`);
    }
  }
}

/** Check if a sandbox is alive by running `docker sandbox ls` and looking for its name. */
function isSandboxAlive(name: string): boolean {
  try {
    const output = execSync("docker sandbox ls", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    return output.includes(name);
  } catch {
    return false;
  }
}
