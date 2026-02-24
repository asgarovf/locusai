/**
 * `locus sprint` — Manage sprints via GitHub Milestones.
 *
 * Subcommands:
 *   create  — Create a new sprint (milestone)
 *   list    — List sprints
 *   show    — Show sprint details (issues, progress, execution order)
 *   active  — Set the active sprint
 *   order   — Reorder sprint tasks (respecting frozen completed tasks)
 *   close   — Close a sprint
 */

import { loadConfig, updateConfigValue } from "../core/config.js";
import {
  closeMilestone,
  createMilestone,
  ensureOrderLabel,
  listIssues,
  listMilestones,
  updateIssueLabels,
} from "../core/github.js";
import { getLogger } from "../core/logger.js";
import { type Column, renderDetails, renderTable } from "../display/table.js";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import type { Issue, Milestone } from "../types.js";

// ─── Argument Parsing ────────────────────────────────────────────────────────

interface SprintArgs {
  subcommand: string;
  positional: string[];
  flags: {
    due?: string;
    description?: string;
    all?: boolean;
    show?: boolean;
  };
}

export function normalizeMilestoneTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function findMilestoneByTitle(
  milestones: Milestone[],
  title: string
): Milestone | undefined {
  const normalizedTitle = normalizeMilestoneTitle(title);
  return milestones.find(
    (m) => normalizeMilestoneTitle(m.title) === normalizedTitle
  );
}

function parseSprintArgs(args: string[]): SprintArgs {
  const flags: SprintArgs["flags"] = {};
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--due":
      case "-d":
        flags.due = args[++i];
        break;
      case "--description":
      case "--desc":
        flags.description = args[++i];
        break;
      case "--all":
      case "-a":
        flags.all = true;
        break;
      case "--show":
        flags.show = true;
        break;
      default:
        positional.push(arg);
    }
    i++;
  }

  const subcommand = positional[0] ?? "list";
  return { subcommand, positional: positional.slice(1), flags };
}

// ─── Command Entry Point ─────────────────────────────────────────────────────

export async function sprintCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const log = getLogger();
  const parsed = parseSprintArgs(args);

  log.debug("sprint command", {
    subcommand: parsed.subcommand,
    args: parsed.positional,
  });

  switch (parsed.subcommand) {
    case "create":
    case "c":
      await sprintCreate(projectRoot, parsed);
      break;
    case "list":
    case "ls":
      await sprintList(projectRoot, parsed);
      break;
    case "show":
      await sprintShow(projectRoot, parsed);
      break;
    case "active":
      await sprintActive(projectRoot, parsed);
      break;
    case "order":
      await sprintOrder(projectRoot, parsed);
      break;
    case "close":
      await sprintClose(projectRoot, parsed);
      break;
    default:
      printSprintHelp();
  }
}

// ─── Subcommands ─────────────────────────────────────────────────────────────

async function sprintCreate(
  projectRoot: string,
  parsed: SprintArgs
): Promise<void> {
  const title = parsed.positional[0];
  if (!title) {
    process.stderr.write(`${red("✗")} Missing sprint name.\n`);
    process.stderr.write(
      `  Usage: ${bold('locus sprint create "Sprint 1" [--due 2026-03-07] [--description "..."]')}\n`
    );
    process.exit(1);
  }

  const config = loadConfig(projectRoot);
  const { owner, repo } = config.github;

  // Format due date if provided
  let dueOn: string | undefined;
  if (parsed.flags.due) {
    const date = new Date(parsed.flags.due);
    if (Number.isNaN(date.getTime())) {
      process.stderr.write(`${red("✗")} Invalid date: ${parsed.flags.due}\n`);
      process.exit(1);
    }
    dueOn = date.toISOString();
  }

  process.stderr.write(`${cyan("●")} Creating sprint "${title}"...`);

  try {
    const _number = createMilestone(
      owner,
      repo,
      title,
      dueOn,
      parsed.flags.description,
      { cwd: projectRoot }
    );

    process.stderr.write(`\r${green("✓")} Created sprint "${bold(title)}"\n`);

    if (parsed.flags.due) {
      process.stderr.write(`  Due: ${parsed.flags.due}\n`);
    }

    // Ask if user wants to set as active
    process.stderr.write(
      `  Set as active sprint: ${bold(`locus sprint active "${title}"`)}\n`
    );
  } catch (e) {
    process.stderr.write(
      `\r${red("✗")} Failed to create sprint: ${(e as Error).message}\n`
    );
    process.exit(1);
  }
}

async function sprintList(
  projectRoot: string,
  parsed: SprintArgs
): Promise<void> {
  const config = loadConfig(projectRoot);
  const { owner, repo } = config.github;
  const activeSprint = config.sprint.active;
  const normalizedActiveSprint = activeSprint
    ? normalizeMilestoneTitle(activeSprint)
    : null;

  const state = parsed.flags.all ? "all" : "open";

  process.stderr.write(`${cyan("●")} Fetching sprints...`);

  let milestones: Milestone[];
  try {
    milestones = listMilestones(
      owner,
      repo,
      state as "open" | "closed" | "all",
      {
        cwd: projectRoot,
      }
    );
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  process.stderr.write("\r\x1b[2K");

  if (milestones.length === 0) {
    process.stderr.write(`${dim("No sprints found.")}\n`);
    process.stderr.write(
      `  Create one: ${bold('locus sprint create "Sprint 1"')}\n`
    );
    return;
  }

  process.stderr.write(
    `${bold("Sprints")} ${dim(`— ${milestones.length} found`)}\n\n`
  );

  const columns: Column[] = [
    {
      key: "active",
      header: " ",
      minWidth: 2,
      format: (_, row) =>
        normalizedActiveSprint !== null &&
        normalizeMilestoneTitle(String(row.title)) === normalizedActiveSprint
          ? green("●")
          : " ",
    },
    {
      key: "title",
      header: "Sprint",
      format: (v, row) =>
        normalizedActiveSprint !== null &&
        normalizeMilestoneTitle(String(row.title)) === normalizedActiveSprint
          ? bold(green(String(v)))
          : bold(String(v)),
    },
    {
      key: "progress",
      header: "Progress",
      minWidth: 12,
      format: (_, row) => {
        const open = row.openIssues as number;
        const closed = row.closedIssues as number;
        const total = open + closed;
        if (total === 0) return dim("no issues");
        const pct = Math.round((closed / total) * 100);
        const bar = progressBar(pct, 10);
        return `${bar} ${dim(`${closed}/${total}`)}`;
      },
    },
    {
      key: "state",
      header: "State",
      format: (v) => (v === "open" ? green("open") : dim("closed")),
    },
    {
      key: "dueOn",
      header: "Due",
      format: (v) => {
        if (!v) return dim("—");
        const date = new Date(v as string);
        const now = new Date();
        const formatted = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (date < now) return red(`${formatted} (overdue)`);
        return formatted;
      },
    },
  ];

  const rows = milestones.map((m) => ({
    active: null,
    title: m.title,
    openIssues: m.openIssues,
    closedIssues: m.closedIssues,
    progress: null,
    state: m.state,
    dueOn: m.dueOn,
  }));

  process.stderr.write(`${renderTable(columns, rows)}\n\n`);

  if (activeSprint) {
    process.stderr.write(`  ${green("●")} = active sprint\n`);
  }
}

async function sprintShow(
  projectRoot: string,
  parsed: SprintArgs
): Promise<void> {
  const config = loadConfig(projectRoot);
  const { owner, repo } = config.github;

  const sprintName = parsed.positional[0] ?? config.sprint.active;
  if (!sprintName) {
    process.stderr.write(
      `${red("✗")} No sprint specified and no active sprint set.\n`
    );
    process.stderr.write(`  Usage: ${bold('locus sprint show "Sprint 1"')}\n`);
    process.stderr.write(
      `  Or set active: ${bold('locus sprint active "Sprint 1"')}\n`
    );
    process.exit(1);
  }

  process.stderr.write(`${cyan("●")} Fetching sprint "${sprintName}"...`);

  // Fetch milestone info
  let milestones: Milestone[];
  try {
    milestones = listMilestones(owner, repo, "all", { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  const milestone = findMilestoneByTitle(milestones, sprintName);
  if (!milestone) {
    process.stderr.write(`\r${red("✗")} Sprint "${sprintName}" not found.\n`);
    process.exit(1);
    return;
  }

  // Fetch issues in sprint
  let issues: Issue[];
  try {
    issues = listIssues(
      { milestone: milestone.title, state: "all" },
      { cwd: projectRoot }
    );
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  process.stderr.write("\r\x1b[2K");

  // Sprint header
  const total = milestone.openIssues + milestone.closedIssues;
  const pct =
    total > 0 ? Math.round((milestone.closedIssues / total) * 100) : 0;

  process.stderr.write(
    `\n${bold(`Sprint: ${milestone.title}`)} ${dim(`(${milestone.state})`)}\n\n`
  );

  const details = renderDetails([
    {
      label: "Progress",
      value: `${progressBar(pct, 20)} ${bold(`${pct}%`)} ${dim(`(${milestone.closedIssues}/${total} tasks)`)}`,
    },
    {
      label: "Due",
      value: milestone.dueOn
        ? new Date(milestone.dueOn).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : dim("no due date"),
    },
    {
      label: "State",
      value: milestone.state === "open" ? green("open") : dim("closed"),
    },
    {
      label: "Active",
      value:
        config.sprint.active &&
        normalizeMilestoneTitle(config.sprint.active) ===
          normalizeMilestoneTitle(milestone.title)
          ? green("yes")
          : dim("no"),
    },
  ]);
  process.stderr.write(`${details}\n`);

  if (milestone.description) {
    process.stderr.write(`\n  ${dim(milestone.description)}\n`);
  }

  // Issue list sorted by order
  if (issues.length > 0) {
    process.stderr.write(
      `\n${bold("Tasks")} ${dim(`(by execution order)`)}\n\n`
    );

    const sorted = sortByOrder(issues);

    const columns: Column[] = [
      {
        key: "order",
        header: "Order",
        minWidth: 5,
        align: "right",
        format: (v) => (v ? dim(`#${v}`) : dim("—")),
      },
      {
        key: "number",
        header: "#",
        minWidth: 5,
        align: "right",
        format: (v) => dim(`#${v}`),
      },
      {
        key: "title",
        header: "Title",
        maxWidth: 45,
        format: (v) => bold(String(v)),
      },
      {
        key: "status",
        header: "Status",
        minWidth: 12,
        format: (_, row) => formatStatus(row.labels as string[]),
      },
      {
        key: "frozen",
        header: " ",
        minWidth: 6,
        format: (_, row) => {
          const labels = row.labels as string[];
          if (isDone(labels)) return dim("frozen");
          return "";
        },
      },
    ];

    const tableRows = sorted.map((issue) => ({
      order: getOrder(issue.labels),
      number: issue.number,
      title: issue.title,
      labels: issue.labels,
      status: null,
      frozen: null,
    }));

    process.stderr.write(`${renderTable(columns, tableRows)}\n`);
  }

  process.stderr.write("\n");
}

async function sprintActive(
  projectRoot: string,
  parsed: SprintArgs
): Promise<void> {
  const sprintName = parsed.positional[0];

  if (!sprintName) {
    // Show current active sprint
    const config = loadConfig(projectRoot);
    if (config.sprint.active) {
      process.stderr.write(
        `Active sprint: ${bold(green(config.sprint.active))}\n`
      );
    } else {
      process.stderr.write(`${dim("No active sprint set.")}\n`);
      process.stderr.write(
        `  Set one: ${bold('locus sprint active "Sprint 1"')}\n`
      );
    }
    return;
  }

  // Verify sprint exists
  const config = loadConfig(projectRoot);
  const { owner, repo } = config.github;

  process.stderr.write(`${cyan("●")} Verifying sprint...`);

  let milestones: Milestone[];
  try {
    milestones = listMilestones(owner, repo, "open", { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  const found = findMilestoneByTitle(milestones, sprintName);
  if (!found) {
    process.stderr.write(
      `\r${red("✗")} Sprint "${sprintName}" not found (or is closed).\n`
    );
    process.exit(1);
    return;
  }

  updateConfigValue(projectRoot, "sprint.active", found.title);
  process.stderr.write(
    `\r${green("✓")} Active sprint set to "${bold(found.title)}"\n`
  );
}

async function sprintOrder(
  projectRoot: string,
  parsed: SprintArgs
): Promise<void> {
  const config = loadConfig(projectRoot);
  const sprintName = parsed.positional[0] ?? config.sprint.active;

  if (!sprintName) {
    process.stderr.write(
      `${red("✗")} No sprint specified and no active sprint set.\n`
    );
    process.exit(1);
  }

  // Fetch issues in sprint
  process.stderr.write(`${cyan("●")} Fetching sprint issues...`);

  let issues: Issue[];
  try {
    issues = listIssues(
      { milestone: sprintName, state: "all" },
      { cwd: projectRoot }
    );
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  process.stderr.write("\r\x1b[2K");

  if (issues.length === 0) {
    process.stderr.write(`${dim("No issues in sprint")} "${sprintName}".\n`);
    return;
  }

  // Partition into completed (frozen) and reorderable
  const completed = issues.filter((i) => isDone(i.labels));
  const reorderable = issues.filter((i) => !isDone(i.labels));

  if (reorderable.length === 0) {
    process.stderr.write(
      `${green("✓")} All tasks in "${sprintName}" are completed. Nothing to reorder.\n`
    );
    return;
  }

  // Calculate floor (highest completed order)
  const floor = completed.reduce((max, issue) => {
    const order = getOrder(issue.labels);
    return order !== null && order > max ? order : max;
  }, 0);

  // --show flag: just display current order
  if (parsed.flags.show) {
    process.stderr.write(`\n${bold(`Sprint Order: ${sprintName}`)}\n\n`);

    const sorted = sortByOrder(issues);

    for (const issue of sorted) {
      const order = getOrder(issue.labels);
      const orderStr = order !== null ? dim(`order:${order}`) : dim("no order");
      const frozen = isDone(issue.labels);
      const status = frozen ? dim(" (frozen)") : "";
      const marker = frozen ? dim("  ✓") : cyan("  ○");

      process.stderr.write(
        `${marker} ${orderStr.padEnd(12)} ${bold(`#${issue.number}`)} ${issue.title}${status}\n`
      );
    }

    process.stderr.write(
      `\n  Floor: ${bold(String(floor))} ${dim(`(completed tasks: orders 1-${floor})`)}\n`
    );
    process.stderr.write(
      `  Reorderable: ${bold(String(reorderable.length))} tasks\n\n`
    );
    return;
  }

  // Get the new order from positional args (issue numbers)
  const newOrderNumbers = parsed.positional
    .slice(1) // first positional is the sprint name
    .filter((a) => /^\d+$/.test(a))
    .map(Number);

  if (newOrderNumbers.length === 0) {
    // No explicit order — show current reorderable tasks and help
    process.stderr.write(
      `\n${bold("Reorderable tasks")} ${dim(`(sprint: ${sprintName})`)}\n\n`
    );

    const sorted = sortByOrder(reorderable);
    for (const issue of sorted) {
      const order = getOrder(issue.labels);
      process.stderr.write(
        `  ${cyan("○")} ${dim(`#${issue.number}`)} ${issue.title} ${order !== null ? dim(`(order:${order})`) : ""}\n`
      );
    }

    process.stderr.write(
      `\n${bold("Usage:")} locus sprint order "${sprintName}" ${reorderable.map((i) => i.number).join(" ")}\n`
    );
    process.stderr.write(
      `  ${dim("List issue numbers in desired execution order.")}\n\n`
    );
    return;
  }

  // Validate: new order must contain exactly the reorderable issue numbers
  const reorderableNumbers = new Set(reorderable.map((i) => i.number));
  const newOrderSet = new Set(newOrderNumbers);

  // Check for completed issues in the order
  for (const num of newOrderNumbers) {
    if (!reorderableNumbers.has(num)) {
      const isCompleted = completed.find((i) => i.number === num);
      if (isCompleted) {
        process.stderr.write(
          `${red("✗")} Issue #${num} is completed (frozen). Cannot reorder completed tasks.\n`
        );
        process.exit(1);
      }
      process.stderr.write(
        `${red("✗")} Issue #${num} is not in sprint "${sprintName}".\n`
      );
      process.exit(1);
    }
  }

  // Check for missing issues
  for (const num of reorderableNumbers) {
    if (!newOrderSet.has(num)) {
      process.stderr.write(
        `${red("✗")} Missing issue #${num} from the new order. All reorderable issues must be included.\n`
      );
      process.stderr.write(
        `  Reorderable issues: ${[...reorderableNumbers].join(", ")}\n`
      );
      process.exit(1);
    }
  }

  // Check for duplicates
  if (newOrderNumbers.length !== newOrderSet.size) {
    process.stderr.write(`${red("✗")} Duplicate issue numbers in the order.\n`);
    process.exit(1);
  }

  // Apply new orders
  process.stderr.write(`\n${bold("Applying new order...")}\n\n`);

  for (let i = 0; i < newOrderNumbers.length; i++) {
    const issueNum = newOrderNumbers[i];
    const newOrder = floor + i + 1;
    const issue = reorderable.find((r) => r.number === issueNum);
    if (!issue) continue;
    const oldOrder = getOrder(issue.labels);

    // Remove old order label, add new one
    const removeLabels = oldOrder !== null ? [`order:${oldOrder}`] : [];
    const addLabels = [`order:${newOrder}`];

    // Ensure order label exists on GitHub
    ensureOrderLabel(newOrder, { cwd: projectRoot });

    process.stderr.write(
      `  ${cyan("●")} #${issueNum} ${issue.title} → order:${newOrder}...`
    );

    try {
      updateIssueLabels(issueNum, addLabels, removeLabels, {
        cwd: projectRoot,
      });
      process.stderr.write(
        `\r  ${green("✓")} #${issueNum} ${issue.title} → ${bold(`order:${newOrder}`)}${oldOrder !== null ? dim(` (was ${oldOrder})`) : ""}\n`
      );
    } catch (e) {
      process.stderr.write(
        `\r  ${red("✗")} #${issueNum}: ${(e as Error).message}\n`
      );
    }
  }

  process.stderr.write(`\n${green("✓")} Sprint order updated.\n\n`);
}

async function sprintClose(
  projectRoot: string,
  parsed: SprintArgs
): Promise<void> {
  const config = loadConfig(projectRoot);
  const sprintName = parsed.positional[0] ?? config.sprint.active;

  if (!sprintName) {
    process.stderr.write(`${red("✗")} No sprint specified.\n`);
    process.stderr.write(`  Usage: ${bold('locus sprint close "Sprint 1"')}\n`);
    process.exit(1);
  }

  const { owner, repo } = config.github;

  // Find milestone number
  process.stderr.write(`${cyan("●")} Closing sprint "${sprintName}"...`);

  let milestones: Milestone[];
  try {
    milestones = listMilestones(owner, repo, "open", { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  const milestone = findMilestoneByTitle(milestones, sprintName);
  if (!milestone) {
    process.stderr.write(
      `\r${red("✗")} Sprint "${sprintName}" not found (or already closed).\n`
    );
    process.exit(1);
    return;
  }

  try {
    closeMilestone(owner, repo, milestone.number, { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  process.stderr.write(
    `\r${green("✓")} Closed sprint "${bold(milestone.title)}"\n`
  );

  // Clear active sprint if it matches
  if (
    config.sprint.active &&
    normalizeMilestoneTitle(config.sprint.active) ===
      normalizeMilestoneTitle(milestone.title)
  ) {
    updateConfigValue(projectRoot, "sprint.active", null);
    process.stderr.write(
      `  ${dim(`Cleared active sprint (was ${milestone.title})`)}\n`
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract order number from labels (e.g., "order:3" → 3). */
function getOrder(labels: string[]): number | null {
  for (const label of labels) {
    if (label.startsWith("order:")) {
      const n = Number.parseInt(label.replace("order:", ""), 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/** Check if an issue is completed. */
function isDone(labels: string[]): boolean {
  return labels.includes("locus:done");
}

/** Sort issues by order:N label (ascending, nulls last). */
function sortByOrder(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const orderA = getOrder(a.labels);
    const orderB = getOrder(b.labels);
    if (orderA === null && orderB === null) return 0;
    if (orderA === null) return 1;
    if (orderB === null) return -1;
    return orderA - orderB;
  });
}

function formatStatus(labels: string[]): string {
  for (const label of labels) {
    if (label === "locus:queued") return dim("queued");
    if (label === "locus:in-progress") return cyan("in-progress");
    if (label === "locus:in-review") return yellow("in-review");
    if (label === "locus:done") return green("done");
    if (label === "locus:failed") return red("failed");
  }
  return dim("—");
}

/** Render a progress bar. */
function progressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return green("█".repeat(filled)) + dim("░".repeat(empty));
}

// ─── Help ────────────────────────────────────────────────────────────────────

function printSprintHelp(): void {
  process.stderr.write(`
${bold("locus sprint")} — Manage sprints via GitHub Milestones

${bold("Subcommands:")}
  ${cyan("create")} ${dim("(c)")}    Create a new sprint
  ${cyan("list")} ${dim("(ls)")}     List sprints (default)
  ${cyan("show")}           Show sprint details and task order
  ${cyan("active")}         Set or show the active sprint
  ${cyan("order")}          Reorder sprint tasks
  ${cyan("close")}          Close a sprint

${bold("Create options:")}
  ${dim("--due, -d")}       Due date (YYYY-MM-DD)
  ${dim("--description")}   Sprint description

${bold("List options:")}
  ${dim("--all, -a")}       Include closed sprints

${bold("Order options:")}
  ${dim("--show")}          Show current order without changing

${bold("Examples:")}
  locus sprint create "Sprint 1" --due 2026-03-07
  locus sprint list
  locus sprint show "Sprint 1"
  locus sprint active "Sprint 1"
  locus sprint order "Sprint 1" 17 15 16
  locus sprint order "Sprint 1" --show
  locus sprint close "Sprint 1"

`);
}
