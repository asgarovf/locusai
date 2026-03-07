/**
 * `locus status` — Dashboard view of the current project state.
 *
 * Combines data from:
 * - Config (active sprint, AI provider)
 * - GitHub milestones (sprint progress)
 * - GitHub PRs (agent-managed PRs)
 * - Worktrees (active parallel agents)
 * - Run state (in-progress execution)
 *
 * This command does NOT interact with the AI and never triggers sandbox sync.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadConfig } from "../core/config.js";
import { listIssues, listMilestones, listPRs } from "../core/github.js";
import { getRunStats, loadRunState } from "../core/run-state.js";
import { listWorktrees } from "../core/worktree.js";
import { progressBar, Spinner } from "../display/progress.js";
import {
  bold,
  cyan,
  dim,
  drawBox,
  green,
  red,
  yellow,
} from "../display/terminal.js";
import {
  extractShortName,
  getPackagesDir,
  loadRegistry,
} from "../packages/registry.js";
import type { SandboxConfig } from "../types.js";

export async function statusCommand(projectRoot: string): Promise<void> {
  const config = loadConfig(projectRoot);

  // Show a spinner while fetching data from GitHub (network calls can be slow)
  const spinner = new Spinner();
  spinner.start("Fetching project status...");

  const lines: string[] = [];

  // ─── Repo Info ───────────────────────────────────────────────────────
  lines.push(
    `  ${dim("Repo:")}     ${cyan(`${config.github.owner}/${config.github.repo}`)}`
  );
  lines.push(
    `  ${dim("Provider:")} ${config.ai.provider} / ${config.ai.model}`
  );
  lines.push(`  ${dim("Branch:")}   ${config.agent.baseBranch}`);

  // ─── Sprint Progress ────────────────────────────────────────────────
  if (config.sprint.active) {
    const sprintName = config.sprint.active;

    try {
      const milestones = listMilestones(
        config.github.owner,
        config.github.repo,
        "open",
        { cwd: projectRoot }
      );
      const milestone = milestones.find(
        (m) => m.title.toLowerCase() === sprintName.toLowerCase()
      );

      if (milestone) {
        const total = milestone.openIssues + milestone.closedIssues;
        const done = milestone.closedIssues;
        const dueStr = milestone.dueOn
          ? ` due ${new Date(milestone.dueOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "";

        lines.push("");
        lines.push(
          `  ${bold("Sprint:")}  ${cyan(sprintName)} (${done} of ${total} done${dueStr})`
        );
        if (total > 0) {
          lines.push(`  ${progressBar(done, total, { width: 30 })}`);
        }

        // Show issue breakdown
        const issues = listIssues(
          { milestone: sprintName, state: "all" },
          { cwd: projectRoot }
        );

        const queued = issues.filter((i) =>
          i.labels.some((l) => l === "locus:queued")
        ).length;
        const inProgress = issues.filter((i) =>
          i.labels.some((l) => l === "locus:in-progress")
        ).length;
        const failed = issues.filter((i) =>
          i.labels.some((l) => l === "locus:failed")
        ).length;

        const parts: string[] = [];
        if (inProgress > 0)
          parts.push(`${yellow("●")} ${inProgress} in-progress`);
        if (queued > 0) parts.push(`${dim("○")} ${queued} queued`);
        if (failed > 0) parts.push(`${red("✗")} ${failed} failed`);
        if (done > 0) parts.push(`${green("✓")} ${done} done`);
        if (parts.length > 0) {
          lines.push(`  ${parts.join("  ")}`);
        }
      } else {
        lines.push("");
        lines.push(
          `  ${bold("Sprint:")}  ${cyan(sprintName)} ${dim("(not found)")}`
        );
      }
    } catch {
      lines.push("");
      lines.push(
        `  ${bold("Sprint:")}  ${cyan(sprintName)} ${dim("(could not fetch)")}`
      );
    }
  } else {
    lines.push("");
    lines.push(`  ${dim("Sprint:")}  ${dim("none active")}`);
  }

  // ─── Run State ───────────────────────────────────────────────────────
  const runState = loadRunState(projectRoot);
  if (runState) {
    const stats = getRunStats(runState);
    lines.push("");
    lines.push(
      `  ${bold("Active Run:")} ${runState.type} ${dim(runState.runId)}`
    );
    lines.push(
      `  ${green("✓")} ${stats.done} done  ${yellow("●")} ${stats.inProgress} running  ${dim("○")} ${stats.pending} pending  ${stats.failed > 0 ? `${red("✗")} ${stats.failed} failed` : ""}`
    );
  }

  // ─── Worktrees ───────────────────────────────────────────────────────
  const worktrees = listWorktrees(projectRoot);
  const activeWorktrees = worktrees.filter((w) => w.status === "active");

  if (activeWorktrees.length > 0) {
    lines.push("");
    lines.push(`  ${bold("Active Worktrees:")}`);
    for (const wt of activeWorktrees) {
      lines.push(`    ${cyan("●")} issue-${wt.issueNumber}  ${dim(wt.branch)}`);
    }
  }

  // ─── Recent PRs ─────────────────────────────────────────────────────
  try {
    const prs = listPRs(
      { label: "agent:managed", state: "open" },
      { cwd: projectRoot }
    );

    if (prs.length > 0) {
      lines.push("");
      lines.push(`  ${bold("Agent PRs:")}`);
      for (const pr of prs.slice(0, 5)) {
        const stateIcon =
          pr.state === "merged"
            ? green("✓")
            : pr.state === "open"
              ? yellow("⟳")
              : dim("●");
        lines.push(
          `    ${stateIcon} #${pr.number}  ${pr.title}  ${dim(pr.state)}`
        );
      }
      if (prs.length > 5) {
        lines.push(`    ${dim(`...and ${prs.length - 5} more`)}`);
      }
    }
  } catch {
    // Non-fatal — skip PR listing
  }

  // ─── Active Agents ─────────────────────────────────────────────────
  const agents = getActiveAgents(config.sandbox);

  if (agents.length > 0) {
    lines.push("");
    lines.push(`  ${bold("Agents:")}`);
    for (const agent of agents) {
      const icon = agent.status === "running" ? green("●") : dim("○");
      const details: string[] = [agent.provider];
      if (agent.sandbox) details.push(dim(`sandbox:${agent.sandbox}`));
      if (agent.pid) details.push(dim(`pid:${agent.pid}`));
      if (agent.uptime) details.push(dim(agent.uptime));
      if (agent.memory) details.push(dim(agent.memory));
      lines.push(
        `    ${icon} ${cyan(agent.provider)}  ${details.slice(1).join("  ")}`
      );

      // Show processes running inside the sandbox
      if (agent.sandboxProcesses && agent.sandboxProcesses.length > 0) {
        for (const proc of agent.sandboxProcesses) {
          lines.push(
            `      ${dim("└")} ${yellow(proc.name)}  ${dim(`pid:${proc.pid}`)}`
          );
        }
      } else if (agent.sandbox && agent.status === "running") {
        lines.push(`      ${dim("└ no agent processes detected")}`);
      }
    }
  }

  // ─── Installed Packages ─────────────────────────────────────────────
  const registry = loadRegistry();
  const entries = Object.values(registry.packages);

  if (entries.length > 0) {
    const pm2Processes = getPm2Processes();

    lines.push("");
    lines.push(`  ${bold("Packages:")}`);
    for (const entry of entries) {
      const shortName = extractShortName(entry.name);
      const processName = `locus-${shortName}`;
      const proc = pm2Processes.find((p) => p.name === processName);

      const statusStr = proc
        ? proc.status === "online"
          ? green("online")
          : proc.status === "stopped"
            ? dim("stopped")
            : yellow(proc.status)
        : dim("not running");

      const details: string[] = [`v${entry.version}`, statusStr];

      if (proc?.pid) {
        details.push(dim(`pid:${proc.pid}`));
      }
      if (proc?.uptime) {
        details.push(dim(formatUptime(proc.uptime)));
      }
      if (proc?.memory) {
        details.push(dim(`${(proc.memory / (1024 * 1024)).toFixed(0)}MB`));
      }

      lines.push(
        `    ${proc?.status === "online" ? green("●") : dim("○")} ${cyan(shortName)}  ${details.join("  ")}`
      );
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────
  spinner.stop();
  lines.push("");

  process.stderr.write(`\n${drawBox(lines, { title: "Locus Status" })}\n`);
}

// ─── PM2 Helpers ──────────────────────────────────────────────────────────

interface Pm2ProcessInfo {
  name: string;
  status: string;
  pid: number | null;
  uptime: number | null;
  memory: number | null;
}

/**
 * Discover the pm2 binary using the same strategy as `@locusai/locus-pm2`:
 * 1. Look in ~/.locus/packages/node_modules/.bin/pm2 (where packages install pm2)
 * 2. Walk up from cwd
 * 3. System PATH
 * 4. Fallback to npx
 */
function getPm2Bin(): string {
  // 1. Check the global packages dir (where locus-pm2 installs pm2)
  const pkgsBin = join(getPackagesDir(), "node_modules", ".bin", "pm2");
  if (existsSync(pkgsBin)) return pkgsBin;

  // 2. Walk up from cwd
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    const candidate = join(dir, "node_modules", ".bin", "pm2");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }

  // 3. System PATH
  try {
    const result = execSync("which pm2", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (result) return result;
  } catch {
    // fall through
  }

  // 4. Fallback
  return "npx pm2";
}

function getPm2Processes(): Pm2ProcessInfo[] {
  try {
    const pm2 = getPm2Bin();
    const output = execSync(`${pm2} jlist`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });

    const processes = JSON.parse(output) as Array<{
      name: string;
      pm2_env?: { status?: string; pm_uptime?: number };
      pid?: number;
      monit?: { memory?: number };
    }>;

    return processes.map((p) => ({
      name: p.name,
      status: p.pm2_env?.status ?? "unknown",
      pid: p.pid ?? null,
      uptime: p.pm2_env?.pm_uptime ?? null,
      memory: p.monit?.memory ?? null,
    }));
  } catch {
    return [];
  }
}

// ─── Agent Detection ──────────────────────────────────────────────────────────

interface AgentInfo {
  provider: string;
  status: "running" | "stopped";
  sandbox?: string;
  pid?: string;
  uptime?: string;
  memory?: string;
  /** Processes detected inside the sandbox container. */
  sandboxProcesses?: SandboxProcessInfo[];
}

interface SandboxProcessInfo {
  name: string;
  pid: string;
  cpu?: string;
  memory?: string;
  command: string;
}

function getActiveAgents(sandboxConfig: SandboxConfig): AgentInfo[] {
  const agents: AgentInfo[] = [];

  if (sandboxConfig.enabled) {
    // Sandbox mode: only check sandbox containers, never local processes
    const sandboxes = getSandboxProcesses();
    for (const [provider, name] of Object.entries(sandboxConfig.providers)) {
      if (!name) continue;
      const sb = sandboxes.find((s) => s.name === name);
      const isRunning = !!sb && sb.status === "running";

      let sandboxProcesses: SandboxProcessInfo[] | undefined;
      if (isRunning) {
        sandboxProcesses = getProcessesInsideSandbox(name);
      }

      agents.push({
        provider,
        status: isRunning ? "running" : "stopped",
        sandbox: name,
        sandboxProcesses,
      });
    }
  } else {
    // Local mode: check for agent processes on the host
    const procs = getAgentProcesses();
    agents.push(...procs);
  }

  return agents;
}

/** Parse `docker sandbox ls` output for sandboxes. */
function getSandboxProcesses(): { name: string; status: string }[] {
  try {
    const output = execSync("docker sandbox ls", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    // docker sandbox ls outputs columns like:
    // SANDBOX                           AGENT    STATUS    WORKSPACE
    // locus-locus-dev-claude-e193dd55   claude   running   /Users/...
    const lines = output.trim().split("\n");
    if (lines.length < 2) return [];

    // Find the STATUS column index from the header
    const header = lines[0];
    const statusIdx = header.search(/\bSTATUS\b/i);

    return lines
      .slice(1)
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0] ?? "";
        // If we found the STATUS header, use its character position to find the right column
        let status = "";
        if (statusIdx >= 0 && line.length > statusIdx) {
          // Extract the word at the STATUS column position
          const rest = line.substring(statusIdx).trim();
          status = (rest.split(/\s+/)[0] ?? "").toLowerCase();
        } else {
          // Fallback: assume last-1 column (before WORKSPACE) or second column
          status = (parts[parts.length - 2] ?? parts[1] ?? "").toLowerCase();
        }
        return { name, status };
      })
      .filter((s) => s.name.length > 0);
  } catch {
    return [];
  }
}

/** Run `ps` inside a sandbox container to detect agent processes. */
function getProcessesInsideSandbox(sandboxName: string): SandboxProcessInfo[] {
  try {
    // Use `docker sandbox exec` with `sh -c` (consistent with the rest of the codebase)
    // and `ps -eo` for predictable column output (avoids fragile `ps aux` column parsing)
    const output = execSync(
      `docker sandbox exec ${sandboxName} sh -c "ps -eo pid,pcpu,pmem,args"`,
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 10000,
      }
    );

    const lines = output.trim().split("\n").slice(1); // skip header
    const processes: SandboxProcessInfo[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();

      // Only include lines that mention an agent binary
      let agentName: string | undefined;
      if (lower.includes("claude")) agentName = "claude";
      else if (lower.includes("codex")) agentName = "codex";
      if (!agentName) continue;

      // Extract PID (first number on the line)
      const pidMatch = line.trim().match(/^(\d+)/);
      if (!pidMatch) continue;

      processes.push({
        name: agentName,
        pid: pidMatch[1],
        command: "",
      });
    }

    return processes;
  } catch {
    return [];
  }
}

/** Detect running agent processes (claude, codex) via ps. */
function getAgentProcesses(): AgentInfo[] {
  const agents: AgentInfo[] = [];

  try {
    const output = execSync("ps -eo pid,pcpu,pmem,args", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });

    const lines = output.trim().split("\n").slice(1); // skip header

    // Collect matching lines per provider
    const providerMatches: Record<
      string,
      { pid: string; cpu: string; mem: string; command: string }
    > = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
      if (!match) continue;

      const [, pid, cpu, mem, command] = match;
      const cmdLower = command.toLowerCase();

      // Skip system/helper commands and ourselves
      if (
        cmdLower.includes("ps -eo") ||
        cmdLower.includes("grep") ||
        cmdLower.includes("locus status") ||
        cmdLower.includes("locus-cli")
      )
        continue;

      // Match actual agent binary invocations (e.g. "claude agent", "/usr/bin/claude", "codex --flag")
      for (const provider of ["claude", "codex"]) {
        if (providerMatches[provider]) continue; // already found one
        const binPattern = new RegExp(`(^|/)${provider}(\\s|$|-)`);
        if (binPattern.test(command)) {
          providerMatches[provider] = { pid, cpu, mem, command };
        }
      }
    }

    for (const [provider, info] of Object.entries(providerMatches)) {
      agents.push({
        provider,
        status: "running",
        pid: info.pid,
        memory: info.mem !== "0.0" ? `${info.mem}%` : undefined,
      });
    }
  } catch {
    // ps not available — skip
  }

  return agents;
}

function formatUptime(pmUptime: number): string {
  const seconds = Math.floor((Date.now() - pmUptime) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
