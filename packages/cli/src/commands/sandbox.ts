/**
 * `locus sandbox` — Manage Docker sandbox lifecycle.
 *
 * Usage:
 *   locus sandbox                    # Create provider sandboxes and enable sandbox mode
 *   locus sandbox claude             # Run claude interactively in the claude sandbox (for login)
 *   locus sandbox codex              # Run codex interactively in the codex sandbox (for login)
 *   locus sandbox rm                 # Destroy provider sandboxes and disable sandbox mode
 *   locus sandbox status             # Show current sandbox state
 */

import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { loadConfig, saveConfig } from "../core/config.js";
import {
  detectSandboxSupport,
  getProviderSandboxName,
} from "../core/sandbox.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { AIProvider, ProviderSandboxes } from "../types.js";

const PROVIDERS: AIProvider[] = ["claude", "codex"];

// ─── Help ────────────────────────────────────────────────────────────────────

function printSandboxHelp(): void {
  process.stderr.write(`
${bold("locus sandbox")} — Manage Docker sandbox lifecycle

${bold("Usage:")}
  locus sandbox                     ${dim("# Create claude/codex sandboxes and enable sandbox mode")}
  locus sandbox claude              ${dim("# Run claude interactively (for login)")}
  locus sandbox codex               ${dim("# Run codex interactively (for login)")}
  locus sandbox rm                  ${dim("# Destroy all provider sandboxes and disable sandbox mode")}
  locus sandbox status              ${dim("# Show current sandbox state")}

${bold("Flow:")}
  1. ${cyan("locus sandbox")}          Create provider sandboxes
  2. ${cyan("locus sandbox claude")}   Login Claude inside its sandbox
  3. ${cyan("locus sandbox codex")}    Login Codex inside its sandbox
  4. ${cyan("locus exec")}/${cyan("locus run")}      Commands resync + execute in provider sandbox

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

  const sandboxNames = buildProviderSandboxNames(projectRoot);
  const readySandboxes: ProviderSandboxes = {};
  let failed = false;

  for (const provider of PROVIDERS) {
    const name = sandboxNames[provider];

    if (isSandboxAlive(name)) {
      process.stderr.write(
        `${green("✓")} ${provider} sandbox ready: ${bold(name)}\n`
      );
      readySandboxes[provider] = name;
      continue;
    }

    process.stderr.write(
      `Creating ${bold(provider)} sandbox ${dim(name)} with workspace ${dim(projectRoot)}...\n`
    );

    const created = await createProviderSandbox(provider, name, projectRoot);
    if (!created) {
      process.stderr.write(
        `${red("✗")} Failed to create ${provider} sandbox (${name}).\n`
      );
      failed = true;
      continue;
    }

    process.stderr.write(
      `${green("✓")} ${provider} sandbox created: ${bold(name)}\n`
    );
    readySandboxes[provider] = name;
  }

  config.sandbox.enabled = true;
  config.sandbox.providers = readySandboxes;
  saveConfig(projectRoot, config);

  if (failed) {
    process.stderr.write(
      `\n${yellow("⚠")} Some sandboxes failed to create. Re-run ${cyan("locus sandbox")} after resolving Docker issues.\n`
    );
  }

  process.stderr.write(
    `\n${green("✓")} Sandbox mode enabled with provider-specific sandboxes.\n`
  );
  process.stderr.write(
    `  Next: run ${cyan("locus sandbox claude")} and ${cyan("locus sandbox codex")} to authenticate both providers.\n`
  );
}

// ─── Agent Login ─────────────────────────────────────────────────────────────

async function handleAgentLogin(
  projectRoot: string,
  agent: AIProvider
): Promise<void> {
  const config = loadConfig(projectRoot);
  const sandboxName = getProviderSandboxName(config.sandbox, agent);

  if (!sandboxName) {
    process.stderr.write(
      `${red("✗")} No ${agent} sandbox configured. Run ${cyan("locus sandbox")} first.\n`
    );
    return;
  }

  if (!isSandboxAlive(sandboxName)) {
    process.stderr.write(
      `${red("✗")} ${agent} sandbox is not running: ${dim(sandboxName)}\n`
    );
    process.stderr.write(
      `  Recreate it with ${cyan("locus sandbox")}.\n`
    );
    return;
  }

  if (agent === "codex") {
    await ensureCodexInSandbox(sandboxName);
  }

  process.stderr.write(`Connecting to ${agent} sandbox ${dim(sandboxName)}...\n`);
  process.stderr.write(`${dim("Login and then exit when ready.")}\n\n`);

  const child = spawn(
    "docker",
    ["sandbox", "exec", "-it", "-w", projectRoot, sandboxName, agent],
    {
      stdio: "inherit",
    }
  );

  await new Promise<void>((resolve) => {
    child.on("close", async (code) => {
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

  const names = Array.from(
    new Set(
      Object.values(config.sandbox.providers).filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )
    )
  );

  if (names.length === 0) {
    config.sandbox.enabled = false;
    config.sandbox.providers = {};
    saveConfig(projectRoot, config);
    process.stderr.write(`${dim("No sandboxes to remove. Sandbox mode disabled.")}\n`);
    return;
  }

  for (const sandboxName of names) {
    process.stderr.write(`Removing sandbox ${bold(sandboxName)}...\n`);
    try {
      execSync(`docker sandbox rm ${sandboxName}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 15000,
      });
    } catch {
      // Best-effort remove (sandbox may already be stopped/removed).
    }
  }

  config.sandbox.providers = {};
  config.sandbox.enabled = false;
  saveConfig(projectRoot, config);

  process.stderr.write(
    `${green("✓")} Provider sandboxes removed. Sandbox mode disabled.\n`
  );
}

// ─── Status ──────────────────────────────────────────────────────────────────

function handleStatus(projectRoot: string): void {
  const config = loadConfig(projectRoot);

  process.stderr.write(`\n${bold("Sandbox Status")}\n\n`);
  process.stderr.write(
    `  ${dim("Enabled:")}  ${config.sandbox.enabled ? green("yes") : red("no")}\n`
  );

  for (const provider of PROVIDERS) {
    const name = config.sandbox.providers[provider];
    process.stderr.write(
      `  ${dim(`${provider}:`).padEnd(15)}${name ? bold(name) : dim("(not configured)")}\n`
    );

    if (name) {
      const alive = isSandboxAlive(name);
      process.stderr.write(
        `  ${dim(`${provider} running:`).padEnd(15)}${alive ? green("yes") : red("no")}\n`
      );
    }
  }

  if (!config.sandbox.providers.claude || !config.sandbox.providers.codex) {
    process.stderr.write(
      `\n  ${yellow("⚠")} Provider sandboxes are incomplete. Run ${bold("locus sandbox")}.\n`
    );
  }

  process.stderr.write("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProviderSandboxNames(projectRoot: string): Record<AIProvider, string> {
  const segment = sanitizeSegment(basename(projectRoot));
  const hash = createHash("sha1").update(projectRoot).digest("hex").slice(0, 8);

  return {
    claude: `locus-${segment}-claude-${hash}`,
    codex: `locus-${segment}-codex-${hash}`,
  };
}

function sanitizeSegment(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "workspace";
}

async function createProviderSandbox(
  provider: AIProvider,
  sandboxName: string,
  projectRoot: string
): Promise<boolean> {
  try {
    execSync(
      `docker sandbox run --name ${sandboxName} claude ${projectRoot} -- --version`,
      {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      }
    );
  } catch {
    // claude --version exits quickly; non-zero exit is acceptable if sandbox exists
  }

  if (!isSandboxAlive(sandboxName)) {
    return false;
  }

  if (provider === "codex") {
    await ensureCodexInSandbox(sandboxName);
  }

  await enforceSandboxIgnore(sandboxName, projectRoot);
  return true;
}

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
