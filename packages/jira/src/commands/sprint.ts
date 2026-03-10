/**
 * Sprint command for locus-jira.
 *
 * Shorthand for `run --sprint`. Fetches active sprint issues
 * and executes them via Locus.
 *
 * Usage:
 *   locus jira sprint                    → run active sprint "To Do" issues
 *   locus jira sprint --status "In Progress" → filter by status
 *   locus jira sprint --info             → show sprint details without running
 *   locus jira sprint --dry-run          → preview without executing
 */

import { JiraClient } from "../client/client.js";
import { loadJiraConfig } from "../config.js";
import { runCommand } from "./run.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SprintOptions {
  status: string;
  info?: boolean;
  dryRun?: boolean;
  sync?: boolean;
}

// ─── Arg Parsing ────────────────────────────────────────────────────────────

function parseSprintArgs(args: string[]): SprintOptions {
  const options: SprintOptions = { status: "To Do" };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--status": {
        const next = args[i + 1];
        if (!next || next.startsWith("--")) {
          process.stderr.write("  --status requires a status name.\n");
          process.exit(1);
        }
        options.status = next;
        i++;
        break;
      }
      case "--info":
        options.info = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--sync":
        options.sync = true;
        break;
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`  Unknown flag: ${arg}\n`);
          process.exit(1);
        }
    }
  }

  return options;
}

// ─── Sprint Info ────────────────────────────────────────────────────────────

async function showSprintInfo(boardId: number): Promise<void> {
  const client = JiraClient.fromConfig();

  process.stderr.write("\n  Fetching active sprint...\n");
  const sprint = await client.getCurrentSprint(boardId);

  if (!sprint) {
    process.stderr.write("  No active sprint found.\n\n");
    return;
  }

  process.stderr.write("\n  Active Sprint\n");
  process.stderr.write(`  ${"═".repeat(50)}\n`);
  process.stderr.write(`  Name:     ${sprint.name}\n`);
  process.stderr.write(`  State:    ${sprint.state}\n`);

  if (sprint.startDate) {
    process.stderr.write(`  Start:    ${sprint.startDate.split("T")[0]}\n`);
  }
  if (sprint.endDate) {
    process.stderr.write(`  End:      ${sprint.endDate.split("T")[0]}\n`);
  }
  if (sprint.goal) {
    process.stderr.write(`  Goal:     ${sprint.goal}\n`);
  }

  // Show issue count breakdown
  const issues = await client.getSprintIssues(boardId, sprint.id);
  const statusCounts = new Map<string, number>();
  for (const issue of issues) {
    const status = issue.fields.status.name;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  process.stderr.write(`\n  Issues (${issues.length} total):\n`);
  for (const [status, count] of statusCounts) {
    process.stderr.write(`    ${status.padEnd(20)} ${count}\n`);
  }

  process.stderr.write("\n");
}

// ─── Command Entry ──────────────────────────────────────────────────────────

export async function sprintCommand(args: string[]): Promise<void> {
  const config = loadJiraConfig();

  if (!config.boardId) {
    process.stderr.write(
      "\n  No board configured. Run: locus jira board\n" +
        "  A board is required to fetch sprint information.\n\n"
    );
    process.exit(1);
  }

  const options = parseSprintArgs(args);

  // Info mode — display sprint details and exit
  if (options.info) {
    return showSprintInfo(config.boardId);
  }

  // Delegate to run command with --sprint flag
  const runArgs = ["--sprint", "--status", options.status];

  if (options.dryRun) {
    runArgs.push("--dry-run");
  }

  if (options.sync) {
    runArgs.push("--sync");
  }

  return runCommand(runArgs);
}
