/**
 * `locus sandbox` — Manage Docker sandbox lifecycle.
 *
 * Usage:
 *   locus sandbox                    # Prompt for a provider and create its sandbox
 *   locus sandbox claude             # Run claude interactively in the claude sandbox (for login)
 *   locus sandbox codex              # Run codex interactively in the codex sandbox (for login)
 *   locus sandbox setup              # Re-run dependency install in sandbox(es)
 *   locus sandbox install bun        # Install a global package in sandbox(es)
 *   locus sandbox shell codex        # Open interactive shell in sandbox
 *   locus sandbox logs codex         # Show sandbox logs
 *   locus sandbox rm                 # Destroy provider sandboxes and disable sandbox mode
 *   locus sandbox status             # Show current sandbox state
 */

import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import { loadConfig, saveConfig } from "../core/config.js";
import {
  detectProjectEcosystem,
  isJavaScriptEcosystem,
} from "../core/ecosystem.js";
import {
  detectSandboxSupport,
  getProviderSandboxName,
} from "../core/sandbox.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { AIProvider, ProviderSandboxes } from "../types.js";

const PROVIDERS: AIProvider[] = ["claude", "codex"];
type ProviderTarget = AIProvider | "all";

// ─── Help ────────────────────────────────────────────────────────────────────

function printSandboxHelp(): void {
  process.stderr.write(`
${bold("locus sandbox")} — Manage Docker sandbox lifecycle

${bold("Usage:")}
  locus sandbox                     ${dim("# Select a provider and create its sandbox")}
  locus sandbox claude              ${dim("# Run claude interactively (for login)")}
  locus sandbox codex               ${dim("# Run codex interactively (for login)")}
  locus sandbox setup               ${dim("# Re-run dependency install in sandbox(es)")}
  locus sandbox install <pkg>       ${dim("# npm install -g package(s) in sandbox(es)")}
  locus sandbox shell <provider>    ${dim("# Open interactive shell in provider sandbox")}
  locus sandbox logs <provider>     ${dim("# Show provider sandbox logs")}
  locus sandbox rm                  ${dim("# Destroy all provider sandboxes and disable sandbox mode")}
  locus sandbox status              ${dim("# Show current sandbox state")}

${bold("Flow:")}
  1. ${cyan("locus sandbox")}              Select a provider and create its sandbox
  2. ${cyan("locus sandbox <provider>")}   Login to the provider inside its sandbox
  3. ${cyan("locus sandbox install bun")}  Install extra tools (optional)
  4. Run ${cyan("locus sandbox")} again to add another provider (optional)

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
    case "setup":
      return handleSetup(projectRoot);
    case "install":
      return handleInstall(projectRoot, args.slice(1));
    case "shell":
      return handleShell(projectRoot, args.slice(1));
    case "logs":
      return handleLogs(projectRoot, args.slice(1));
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
        `  Available: ${cyan("claude")}, ${cyan("codex")}, ${cyan("setup")}, ${cyan("install")}, ${cyan("exec")}, ${cyan("shell")}, ${cyan("logs")}, ${cyan("rm")}, ${cyan("status")}\n`
      );
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

async function promptProviderSelection(): Promise<AIProvider | null> {
  process.stderr.write(`\n${bold("Select a provider to create a sandbox for:")}\n\n`);
  for (let i = 0; i < PROVIDERS.length; i++) {
    process.stderr.write(`  ${bold(String(i + 1))}. ${PROVIDERS[i]}\n`);
  }
  process.stderr.write("\n");

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise<AIProvider | null>((resolve) => {
    rl.question("Enter choice (1-2): ", (answer) => {
      const trimmed = answer.trim().toLowerCase();

      // Accept provider name directly
      if (trimmed === "claude" || trimmed === "codex") {
        resolve(trimmed);
        rl.close();
        return;
      }

      // Accept number
      const num = Number.parseInt(trimmed, 10);
      if (num >= 1 && num <= PROVIDERS.length) {
        resolve(PROVIDERS[num - 1]);
        rl.close();
        return;
      }

      process.stderr.write(`${red("✗")} Invalid selection.\n`);
      resolve(null);
      rl.close();
    });

    rl.on("close", () => resolve(null));
  });
}

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

  const provider = await promptProviderSelection();
  if (!provider) return;

  const sandboxNames = buildProviderSandboxNames(projectRoot);
  const name = sandboxNames[provider];

  // Preserve existing config for other providers
  const readySandboxes: ProviderSandboxes = { ...config.sandbox.providers };

  if (isSandboxAlive(name)) {
    process.stderr.write(
      `${green("✓")} ${provider} sandbox already exists: ${bold(name)}\n`
    );
    readySandboxes[provider] = name;
    config.sandbox.enabled = true;
    config.sandbox.providers = readySandboxes;
    saveConfig(projectRoot, config);
    process.stderr.write(
      `  Next: run ${cyan(`locus sandbox ${provider}`)} to authenticate.\n`
    );
    return;
  }

  process.stderr.write(
    `Creating ${bold(provider)} sandbox ${dim(name)} with workspace ${dim(projectRoot)}...\n`
  );

  const created = await createProviderSandbox(provider, name, projectRoot);
  if (!created) {
    process.stderr.write(
      `${red("✗")} Failed to create ${provider} sandbox (${name}).\n`
    );
    process.stderr.write(
      `  Re-run ${cyan("locus sandbox")} after resolving Docker issues.\n`
    );
    return;
  }

  process.stderr.write(
    `${green("✓")} ${provider} sandbox created: ${bold(name)}\n`
  );

  readySandboxes[provider] = name;
  config.sandbox.enabled = true;
  config.sandbox.providers = readySandboxes;
  saveConfig(projectRoot, config);

  // Install project dependencies in the newly created sandbox
  await runSandboxSetup(name, projectRoot);

  process.stderr.write(
    `\n${green("✓")} Sandbox mode enabled for ${bold(provider)}.\n`
  );
  process.stderr.write(
    `  Next: run ${cyan(`locus sandbox ${provider}`)} to authenticate.\n`
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
    process.stderr.write(`  Recreate it with ${cyan("locus sandbox")}.\n`);
    return;
  }

  if (agent === "codex") {
    await ensureCodexInSandbox(sandboxName);
  }

  process.stderr.write(
    `Connecting to ${agent} sandbox ${dim(sandboxName)}...\n`
  );
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
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    )
  );

  if (names.length === 0) {
    config.sandbox.enabled = false;
    config.sandbox.providers = {};
    saveConfig(projectRoot, config);
    process.stderr.write(
      `${dim("No sandboxes to remove. Sandbox mode disabled.")}\n`
    );
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

  if (!config.sandbox.providers.claude && !config.sandbox.providers.codex) {
    process.stderr.write(
      `\n  ${yellow("⚠")} No provider sandboxes configured. Run ${bold("locus sandbox")} to create one.\n`
    );
  }

  process.stderr.write("\n");
}

// ─── Install Packages ───────────────────────────────────────────────────────

export function parseSandboxInstallArgs(args: string[]): {
  provider: ProviderTarget;
  packages: string[];
  error?: string;
} {
  const packages: string[] = [];
  let provider: ProviderTarget = "all";

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === "--provider") {
      const value = args[i + 1];
      if (!value) {
        return {
          provider,
          packages,
          error:
            "Missing value for --provider (expected claude, codex, or all).",
        };
      }
      if (value !== "claude" && value !== "codex" && value !== "all") {
        return {
          provider,
          packages,
          error: `Invalid provider "${value}". Expected claude, codex, or all.`,
        };
      }
      provider = value;
      i++;
      continue;
    }

    if (token.startsWith("--provider=")) {
      const value = token.slice("--provider=".length);
      if (value !== "claude" && value !== "codex" && value !== "all") {
        return {
          provider,
          packages,
          error: `Invalid provider "${value}". Expected claude, codex, or all.`,
        };
      }
      provider = value;
      continue;
    }

    if (token.startsWith("-")) {
      return {
        provider,
        packages,
        error: `Unknown option "${token}".`,
      };
    }

    packages.push(token);
  }

  if (packages.length === 0) {
    return {
      provider,
      packages,
      error:
        "Usage: locus sandbox install <package...> [--provider claude|codex|all]",
    };
  }

  return { provider, packages };
}

async function handleInstall(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const parsed = parseSandboxInstallArgs(args);
  if (parsed.error) {
    process.stderr.write(`${red("✗")} ${parsed.error}\n`);
    return;
  }

  const config = loadConfig(projectRoot);
  const targets = getTargetProviders(config.sandbox.providers, parsed.provider);
  if (targets.length === 0) {
    process.stderr.write(
      `${red("✗")} No provider sandboxes are configured. Run ${cyan("locus sandbox")} first.\n`
    );
    return;
  }

  let anySucceeded = false;
  let anyFailed = false;

  for (const provider of targets) {
    const sandboxName = config.sandbox.providers[provider];
    if (!sandboxName) {
      process.stderr.write(
        `${yellow("⚠")} ${provider} sandbox is not configured. Run ${cyan("locus sandbox")} first.\n`
      );
      anyFailed = true;
      continue;
    }

    if (!isSandboxAlive(sandboxName)) {
      process.stderr.write(
        `${yellow("⚠")} ${provider} sandbox is not running: ${dim(sandboxName)}\n`
      );
      anyFailed = true;
      continue;
    }

    process.stderr.write(
      `Installing ${bold(parsed.packages.join(", "))} in ${provider} sandbox ${dim(sandboxName)}...\n`
    );
    const ok = await runInteractiveCommand("docker", [
      "sandbox",
      "exec",
      sandboxName,
      "npm",
      "install",
      "-g",
      ...parsed.packages,
    ]);
    if (ok) {
      anySucceeded = true;
      process.stderr.write(
        `${green("✓")} Installed package(s) in ${provider} sandbox.\n`
      );
    } else {
      anyFailed = true;
      process.stderr.write(
        `${red("✗")} Failed to install package(s) in ${provider} sandbox.\n`
      );
    }
  }

  if (!anySucceeded && anyFailed) {
    process.stderr.write(
      `${yellow("⚠")} No package installs completed successfully.\n`
    );
  }
}

// ─── Exec / Shell / Logs ────────────────────────────────────────────────────

export function parseSandboxExecArgs(args: string[]): {
  provider?: AIProvider;
  command: string[];
  error?: string;
} {
  if (args.length === 0) {
    return {
      command: [],
      error: "Usage: locus sandbox exec <provider> -- <command...>",
    };
  }

  const provider = args[0];
  if (provider !== "claude" && provider !== "codex") {
    return {
      command: [],
      error: `Invalid provider "${provider}". Expected claude or codex.`,
    };
  }

  const separatorIndex = args.indexOf("--");
  const command =
    separatorIndex >= 0 ? args.slice(separatorIndex + 1) : args.slice(1);

  if (command.length === 0) {
    return {
      provider,
      command: [],
      error:
        "Missing command. Example: locus sandbox exec codex -- bun --version",
    };
  }

  return { provider, command };
}

async function handleShell(projectRoot: string, args: string[]): Promise<void> {
  const provider = args[0];
  if (provider !== "claude" && provider !== "codex") {
    process.stderr.write(
      `${red("✗")} Usage: locus sandbox shell <provider>  (provider: claude|codex)\n`
    );
    return;
  }

  const sandboxName = getActiveProviderSandbox(projectRoot, provider);
  if (!sandboxName) {
    return;
  }

  process.stderr.write(
    `Opening shell in ${provider} sandbox ${dim(sandboxName)}...\n`
  );
  await runInteractiveCommand("docker", [
    "sandbox",
    "exec",
    "-it",
    "-w",
    projectRoot,
    sandboxName,
    "sh",
  ]);
}

export function parseSandboxLogsArgs(args: string[]): {
  provider?: AIProvider;
  follow: boolean;
  tail?: number;
  error?: string;
} {
  if (args.length === 0) {
    return {
      follow: false,
      error: "Usage: locus sandbox logs <provider> [--follow] [--tail <lines>]",
    };
  }

  const provider = args[0];
  if (provider !== "claude" && provider !== "codex") {
    return {
      follow: false,
      error: `Invalid provider "${provider}". Expected claude or codex.`,
    };
  }

  let follow = false;
  let tail: number | undefined;

  for (let i = 1; i < args.length; i++) {
    const token = args[i];
    if (token === "--follow" || token === "-f") {
      follow = true;
      continue;
    }

    if (token === "--tail") {
      const value = args[i + 1];
      if (!value) {
        return { provider, follow, tail, error: "Missing value for --tail." };
      }
      const parsedTail = Number.parseInt(value, 10);
      if (!Number.isFinite(parsedTail) || parsedTail < 0) {
        return { provider, follow, tail, error: "Invalid --tail value." };
      }
      tail = parsedTail;
      i++;
      continue;
    }

    if (token.startsWith("--tail=")) {
      const value = token.slice("--tail=".length);
      const parsedTail = Number.parseInt(value, 10);
      if (!Number.isFinite(parsedTail) || parsedTail < 0) {
        return { provider, follow, tail, error: "Invalid --tail value." };
      }
      tail = parsedTail;
      continue;
    }

    return {
      provider,
      follow,
      tail,
      error: `Unknown option "${token}".`,
    };
  }

  return { provider, follow, tail };
}

async function handleLogs(projectRoot: string, args: string[]): Promise<void> {
  const parsed = parseSandboxLogsArgs(args);
  if (parsed.error || !parsed.provider) {
    process.stderr.write(`${red("✗")} ${parsed.error}\n`);
    return;
  }

  const sandboxName = getActiveProviderSandbox(projectRoot, parsed.provider);
  if (!sandboxName) {
    return;
  }

  const dockerArgs = ["sandbox", "logs"];
  if (parsed.follow) {
    dockerArgs.push("--follow");
  }
  if (parsed.tail !== undefined) {
    dockerArgs.push("--tail", String(parsed.tail));
  }
  dockerArgs.push(sandboxName);

  await runInteractiveCommand("docker", dockerArgs);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

type PackageManager = "bun" | "npm" | "yarn" | "pnpm";

function detectPackageManager(projectRoot: string): PackageManager {
  // 1. Check packageManager field in package.json
  try {
    const raw = readFileSync(join(projectRoot, "package.json"), "utf-8");
    const pkgJson = JSON.parse(raw);
    if (typeof pkgJson.packageManager === "string") {
      const name = pkgJson.packageManager.split("@")[0];
      if (
        name === "bun" ||
        name === "npm" ||
        name === "yarn" ||
        name === "pnpm"
      ) {
        return name;
      }
    }
  } catch {
    // package.json not found or unparsable — fall through to lockfile detection
  }

  // 2. Fallback: detect from lockfiles
  if (
    existsSync(join(projectRoot, "bun.lock")) ||
    existsSync(join(projectRoot, "bun.lockb"))
  ) {
    return "bun";
  }
  if (existsSync(join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  return "npm";
}

function getInstallCommand(pm: PackageManager): string[] {
  // No --frozen-lockfile: the sandbox runs Linux while the host lockfile
  // reflects macOS binaries, so platform-specific deps must be re-resolved.
  switch (pm) {
    case "bun":
      return ["bun", "install"];
    case "yarn":
      return ["yarn", "install"];
    case "pnpm":
      return ["pnpm", "install"];
    case "npm":
      return ["npm", "install"];
  }
}

async function runSandboxSetup(
  sandboxName: string,
  projectRoot: string
): Promise<boolean> {
  const ecosystem = detectProjectEcosystem(projectRoot);
  const isJS = isJavaScriptEcosystem(ecosystem);

  // Only run JS package install for JavaScript/TypeScript projects
  if (isJS) {
    const pm = detectPackageManager(projectRoot);

    // npm is always available in the sandbox; other PMs need to be installed first
    if (pm !== "npm") {
      await ensurePackageManagerInSandbox(sandboxName, pm);
    }

    const installCmd = getInstallCommand(pm);

    process.stderr.write(
      `\nInstalling dependencies (${bold(installCmd.join(" "))}) in sandbox ${dim(sandboxName)}...\n`
    );

    const installOk = await runInteractiveCommand("docker", [
      "sandbox",
      "exec",
      "-w",
      projectRoot,
      sandboxName,
      ...installCmd,
    ]);

    if (!installOk) {
      process.stderr.write(
        `${red("✗")} Dependency install failed in sandbox ${dim(sandboxName)}.\n`
      );
      return false;
    }

    process.stderr.write(
      `${green("✓")} Dependencies installed in sandbox ${dim(sandboxName)}.\n`
    );
  } else {
    process.stderr.write(
      `\n${dim(`Detected ${ecosystem} project — skipping JS package install.`)}\n`
    );
  }

  // Run optional setup hook (important for non-JS projects)
  const setupScript = join(projectRoot, ".locus", "sandbox-setup.sh");
  if (existsSync(setupScript)) {
    process.stderr.write(
      `Running ${bold(".locus/sandbox-setup.sh")} in sandbox ${dim(sandboxName)}...\n`
    );
    const hookOk = await runInteractiveCommand("docker", [
      "sandbox",
      "exec",
      "-w",
      projectRoot,
      sandboxName,
      "sh",
      setupScript,
    ]);
    if (!hookOk) {
      process.stderr.write(
        `${yellow("⚠")} Setup hook failed in sandbox ${dim(sandboxName)}.\n`
      );
    }
  } else if (!isJS) {
    process.stderr.write(
      `${yellow("⚠")} No ${bold(".locus/sandbox-setup.sh")} found. Create one to install ${ecosystem} toolchain in the sandbox.\n`
    );
    process.stderr.write(
      `  Re-run ${cyan("locus init")} to auto-generate a template, or create it manually.\n`
    );
  }

  return true;
}

async function handleSetup(projectRoot: string): Promise<void> {
  const config = loadConfig(projectRoot);
  const providers = config.sandbox.providers;

  if (!providers.claude && !providers.codex) {
    process.stderr.write(
      `${red("✗")} No sandboxes configured. Run ${cyan("locus sandbox")} first.\n`
    );
    return;
  }

  for (const provider of PROVIDERS) {
    const sandboxName = providers[provider];
    if (!sandboxName) continue;

    if (!isSandboxAlive(sandboxName)) {
      process.stderr.write(
        `${yellow("⚠")} ${provider} sandbox is not running: ${dim(sandboxName)}\n`
      );
      continue;
    }

    await runSandboxSetup(sandboxName, projectRoot);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProviderSandboxNames(
  projectRoot: string
): Record<AIProvider, string> {
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

function getTargetProviders(
  sandboxes: ProviderSandboxes,
  provider: ProviderTarget
): AIProvider[] {
  if (provider === "claude" || provider === "codex") {
    return [provider];
  }
  return PROVIDERS.filter((name) => Boolean(sandboxes[name]));
}

function getActiveProviderSandbox(
  projectRoot: string,
  provider: AIProvider
): string | null {
  const config = loadConfig(projectRoot);
  const sandboxName = config.sandbox.providers[provider];
  if (!sandboxName) {
    process.stderr.write(
      `${red("✗")} No ${provider} sandbox configured. Run ${cyan("locus sandbox")} first.\n`
    );
    return null;
  }
  if (!isSandboxAlive(sandboxName)) {
    process.stderr.write(
      `${red("✗")} ${provider} sandbox is not running: ${dim(sandboxName)}\n`
    );
    process.stderr.write(`  Recreate it with ${cyan("locus sandbox")}.\n`);
    return null;
  }
  return sandboxName;
}

function runInteractiveCommand(
  command: string,
  args: string[]
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function createProviderSandbox(
  provider: AIProvider,
  sandboxName: string,
  projectRoot: string
): Promise<boolean> {
  try {
    execSync(
      `docker sandbox create --name ${sandboxName} claude ${projectRoot}`,
      {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      }
    );
  } catch {
    // Creation may fail if sandbox already exists — check below
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
 * Ensure the detected package manager binary is available inside the sandbox.
 * Docker sandbox only ships with npm; bun/yarn/pnpm must be installed globally.
 */
async function ensurePackageManagerInSandbox(
  sandboxName: string,
  pm: PackageManager
): Promise<void> {
  try {
    execSync(`docker sandbox exec ${sandboxName} which ${pm}`, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
  } catch {
    const npmPkg = pm === "bun" ? "bun" : pm === "yarn" ? "yarn" : "pnpm";
    process.stderr.write(`Installing ${bold(pm)} in sandbox...\n`);
    try {
      execSync(`docker sandbox exec ${sandboxName} npm install -g ${npmPkg}`, {
        stdio: "inherit",
        timeout: 120_000,
      });
    } catch {
      process.stderr.write(
        `${yellow("⚠")} Failed to install ${pm} in sandbox. Dependency install may fail.\n`
      );
    }
  }
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
