/**
 * `locus status` — Dashboard view of the current project state.
 *
 * Combines data from:
 * - Config (active sprint, AI provider)
 * - GitHub milestones (sprint progress)
 * - GitHub PRs (agent-managed PRs)
 * - Worktrees (active parallel agents)
 * - Run state (in-progress execution)
 */

import { loadConfig } from "../core/config.js";
import { listIssues, listMilestones, listPRs } from "../core/github.js";
import { getRunStats, loadRunState } from "../core/run-state.js";
import { listWorktrees } from "../core/worktree.js";
import { progressBar } from "../display/progress.js";
import {
  bold,
  cyan,
  dim,
  drawBox,
  green,
  red,
  yellow,
} from "../display/terminal.js";

export async function statusCommand(projectRoot: string): Promise<void> {
  const config = loadConfig(projectRoot);
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

  // ─── Render ──────────────────────────────────────────────────────────
  lines.push("");

  process.stderr.write(`\n${drawBox(lines, { title: "Locus Status" })}\n`);
}
