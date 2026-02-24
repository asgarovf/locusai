/**
 * `locus issue` — Manage GitHub issues as work items.
 *
 * Subcommands:
 *   create  — Create a new issue via AI-powered task generation
 *   list    — List issues with filters (sprint, priority, status, assignee)
 *   show    — Show issue details
 *   label   — Bulk-assign issues to a sprint or add labels
 *   close   — Close an issue
 */

import { createInterface } from "node:readline";
import { runAI } from "../ai/run-ai.js";
import { loadConfig } from "../core/config.js";
import {
  createIssue,
  getIssue,
  gh,
  listIssues,
  updateIssueLabels,
} from "../core/github.js";
import { getLogger } from "../core/logger.js";
import { type Column, renderDetails, renderTable } from "../display/table.js";
import {
  blue,
  bold,
  cyan,
  dim,
  green,
  magenta,
  red,
  yellow,
} from "../display/terminal.js";
import {
  type Issue,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
} from "../types.js";

// ─── Argument Parsing ────────────────────────────────────────────────────────

interface IssueArgs {
  subcommand: string;
  positional: string[];
  flags: {
    body?: string;
    priority?: string;
    type?: string;
    sprint?: string;
    status?: string;
    mine?: boolean;
    state?: string;
    label?: string;
    limit?: number;
    reason?: string;
  };
}

function parseIssueArgs(args: string[]): IssueArgs {
  const flags: IssueArgs["flags"] = {};
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--body":
      case "-b":
        flags.body = args[++i];
        break;
      case "--priority":
      case "-p":
        flags.priority = args[++i];
        break;
      case "--type":
      case "-t":
        flags.type = args[++i];
        break;
      case "--sprint":
      case "-s":
        flags.sprint = args[++i];
        break;
      case "--status":
        flags.status = args[++i];
        break;
      case "--state":
        flags.state = args[++i];
        break;
      case "--label":
      case "-l":
        flags.label = args[++i];
        break;
      case "--mine":
      case "-m":
        flags.mine = true;
        break;
      case "--limit":
      case "-n":
        flags.limit = Number.parseInt(args[++i], 10);
        break;
      case "--reason":
      case "-r":
        flags.reason = args[++i];
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

export async function issueCommand(
  projectRoot: string,
  args: string[]
): Promise<void> {
  const log = getLogger();
  const parsed = parseIssueArgs(args);

  log.debug("issue command", {
    subcommand: parsed.subcommand,
    args: parsed.positional,
  });

  switch (parsed.subcommand) {
    case "create":
    case "c":
      await issueCreate(projectRoot, parsed);
      break;
    case "list":
    case "ls":
      await issueList(projectRoot, parsed);
      break;
    case "show":
      await issueShow(projectRoot, parsed);
      break;
    case "label":
      await issueLabel(projectRoot, parsed);
      break;
    case "close":
      await issueClose(projectRoot, parsed);
      break;
    default:
      // If subcommand looks like a number, treat it as `show <number>`
      if (/^\d+$/.test(parsed.subcommand)) {
        parsed.positional.unshift(parsed.subcommand);
        await issueShow(projectRoot, parsed);
      } else {
        printIssueHelp();
      }
  }
}

// ─── Subcommands ─────────────────────────────────────────────────────────────

async function issueCreate(
  projectRoot: string,
  parsed: IssueArgs
): Promise<void> {
  const config = loadConfig(projectRoot);

  // Get the task description from positional args or prompt interactively
  let userPrompt = parsed.positional.join(" ").trim();

  if (!userPrompt) {
    if (!process.stdin.isTTY) {
      process.stderr.write(`${red("✗")} No task description provided.\n`);
      process.stderr.write(
        `  Usage: ${bold('locus issue create "Describe the task..."')}\n`
      );
      process.exit(1);
    }
    userPrompt = await askQuestion(`${cyan("?")} Describe the task: `);
    if (!userPrompt) {
      process.stderr.write(`${red("✗")} No description provided.\n`);
      process.exit(1);
    }
  }

  // Call AI silently to generate structured issue details
  const aiResult = await runAI({
    prompt: buildIssueCreationPrompt(userPrompt),
    provider: config.ai.provider,
    model: config.ai.model,
    cwd: projectRoot,
    silent: true,
    activity: "generating issue",
  });

  if (!aiResult.success && !aiResult.interrupted) {
    process.stderr.write(
      `${red("✗")} Failed to generate issue: ${aiResult.error}\n`
    );
    process.exit(1);
  }

  if (aiResult.interrupted) {
    process.stderr.write(`${yellow("○")} Cancelled.\n`);
    return;
  }

  // Parse JSON from AI output
  let issueData: {
    title: string;
    body: string;
    priority: string;
    type: string;
  };
  try {
    const jsonText = extractJSON(aiResult.output);
    issueData = JSON.parse(jsonText);
  } catch {
    process.stderr.write(`${red("✗")} Failed to parse AI response.\n`);
    process.stderr.write(
      `${dim("Raw output:")} ${aiResult.output.slice(0, 300)}\n`
    );
    process.exit(1);
    return;
  }

  if (!issueData.title) {
    process.stderr.write(`${red("✗")} AI response is missing a title.\n`);
    process.exit(1);
    return;
  }

  // Show preview
  process.stderr.write(`\n${bold("Generated Issue:")}\n\n`);
  process.stderr.write(`  ${bold("Title:")}    ${issueData.title}\n`);
  if (issueData.type) {
    process.stderr.write(
      `  ${bold("Type:")}     ${formatType([`type:${issueData.type}`]) || issueData.type}\n`
    );
  }
  if (issueData.priority) {
    process.stderr.write(
      `  ${bold("Priority:")} ${formatPriority([`p:${issueData.priority}`]) || issueData.priority}\n`
    );
  }
  if (parsed.flags.sprint) {
    process.stderr.write(`  ${bold("Sprint:")}   ${parsed.flags.sprint}\n`);
  }
  if (issueData.body?.trim()) {
    process.stderr.write(
      `\n${dim("───────────────────────────────────────")}\n`
    );
    process.stderr.write(`${issueData.body.trim()}\n`);
    process.stderr.write(
      `${dim("───────────────────────────────────────")}\n`
    );
  }
  process.stderr.write("\n");

  // Ask for confirmation
  const answer = await askQuestion(
    `${cyan("?")} Create this issue? ${dim("[Y/n]")} `
  );
  if (answer.toLowerCase() === "n" || answer.toLowerCase() === "no") {
    process.stderr.write(`${yellow("○")} Cancelled.\n`);
    return;
  }

  // Build labels
  const labels: string[] = ["agent:managed", "locus:queued"];

  const pLabel = `p:${issueData.priority}`;
  if (PRIORITY_LABELS.find((l) => l.name === pLabel)) {
    labels.push(pLabel);
  }

  const tLabel = `type:${issueData.type}`;
  if (TYPE_LABELS.find((l) => l.name === tLabel)) {
    labels.push(tLabel);
  }

  process.stderr.write(`${cyan("●")} Creating issue...`);

  try {
    const number = createIssue(
      issueData.title,
      issueData.body ?? "",
      labels,
      parsed.flags.sprint,
      { cwd: projectRoot }
    );

    process.stderr.write(
      `\r${green("✓")} Created issue ${bold(`#${number}`)} — ${issueData.title}\n`
    );
    if (parsed.flags.sprint) {
      process.stderr.write(`  Sprint: ${parsed.flags.sprint}\n`);
    }
    process.stderr.write(`  Labels: ${labels.join(", ")}\n`);
  } catch (e) {
    process.stderr.write(
      `\r${red("✗")} Failed to create issue: ${(e as Error).message}\n`
    );
    process.exit(1);
  }
}

// ─── Issue Creation Helpers ───────────────────────────────────────────────────

function buildIssueCreationPrompt(userRequest: string): string {
  return [
    "You are a task planner for a software development team.",
    "Given a user request, create a well-structured GitHub issue.",
    "",
    'Output ONLY a valid JSON object with exactly these fields:',
    '- "title": A concise, actionable issue title (max 80 characters)',
    '- "body": Detailed markdown description with context, acceptance criteria, and technical notes',
    '- "priority": One of: critical, high, medium, low',
    '- "type": One of: feature, bug, chore, refactor, docs',
    "",
    `User request: ${userRequest}`,
    "",
    "Output ONLY the JSON object. No explanations, no code execution, no other text.",
  ].join("\n");
}

function extractJSON(text: string): string {
  // Try JSON inside a markdown code block
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // Try raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function issueList(
  projectRoot: string,
  parsed: IssueArgs
): Promise<void> {
  const _config = loadConfig(projectRoot);
  const _log = getLogger();

  // Build filters
  const state = (parsed.flags.state as "open" | "closed" | "all") ?? "open";
  const filters: Parameters<typeof listIssues>[0] = {
    state,
    limit: parsed.flags.limit ?? 50,
  };

  if (parsed.flags.sprint) filters.milestone = parsed.flags.sprint;
  if (parsed.flags.mine) filters.assignee = "@me";

  // Label filter — priority, status, or custom
  let labelFilter: string | undefined;
  if (parsed.flags.priority) labelFilter = `p:${parsed.flags.priority}`;
  else if (parsed.flags.status) labelFilter = `locus:${parsed.flags.status}`;
  else if (parsed.flags.label) labelFilter = parsed.flags.label;
  if (labelFilter) filters.label = labelFilter;

  process.stderr.write(`${cyan("●")} Fetching issues...`);

  let issues: Issue[];
  try {
    issues = listIssues(filters, { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(
      `\r${red("✗")} Failed to list issues: ${(e as Error).message}\n`
    );
    process.exit(1);
    return;
  }

  // Clear loading indicator
  process.stderr.write("\r\x1b[2K");

  if (issues.length === 0) {
    const filterDesc = buildFilterDescription(parsed);
    process.stderr.write(
      `${dim("No issues found")}${filterDesc ? dim(` (${filterDesc})`) : ""}${dim(".")}\n`
    );
    return;
  }

  // Print header
  const filterDesc = buildFilterDescription(parsed);
  process.stderr.write(
    `${bold("Issues")}${filterDesc ? ` ${dim(`(${filterDesc})`)}` : ""} ${dim(`— ${issues.length} result${issues.length === 1 ? "" : "s"}`)}\n\n`
  );

  // Define columns
  const columns: Column[] = [
    {
      key: "number",
      header: "#",
      minWidth: 4,
      align: "right",
      format: (v) => dim(`#${v}`),
    },
    {
      key: "title",
      header: "Title",
      maxWidth: 50,
      format: (v) => bold(String(v)),
    },
    {
      key: "priority",
      header: "Priority",
      minWidth: 8,
      format: (_, row) => formatPriority(row.labels as string[]),
    },
    {
      key: "type",
      header: "Type",
      minWidth: 8,
      format: (_, row) => formatType(row.labels as string[]),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 12,
      format: (_, row) => formatStatus(row.labels as string[]),
    },
    {
      key: "milestone",
      header: "Sprint",
      minWidth: 8,
      format: (v) => (v ? String(v) : dim("—")),
    },
  ];

  const tableRows = issues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    labels: issue.labels,
    milestone: issue.milestone,
    priority: null,
    type: null,
    status: null,
  }));

  process.stderr.write(`${renderTable(columns, tableRows)}\n`);
}

async function issueShow(
  projectRoot: string,
  parsed: IssueArgs
): Promise<void> {
  const numberStr = parsed.positional[0];
  if (!numberStr || !/^\d+$/.test(numberStr)) {
    process.stderr.write(`${red("✗")} Missing or invalid issue number.\n`);
    process.stderr.write(`  Usage: ${bold("locus issue show <number>")}\n`);
    process.exit(1);
  }

  const number = Number.parseInt(numberStr, 10);

  process.stderr.write(`${cyan("●")} Fetching issue #${number}...`);

  let issue: Issue;
  try {
    issue = getIssue(number, { cwd: projectRoot });
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
    return;
  }

  process.stderr.write("\r\x1b[2K");

  // Header
  process.stderr.write(
    `\n${bold(`#${issue.number}`)} ${bold(issue.title)}\n\n`
  );

  // Details
  const details = renderDetails([
    {
      label: "State",
      value: issue.state === "open" ? green("open") : red("closed"),
    },
    { label: "Priority", value: formatPriority(issue.labels) || dim("none") },
    { label: "Type", value: formatType(issue.labels) || dim("none") },
    { label: "Status", value: formatStatus(issue.labels) || dim("none") },
    { label: "Sprint", value: issue.milestone ?? dim("none") },
    {
      label: "Assignees",
      value:
        issue.assignees.length > 0
          ? issue.assignees.join(", ")
          : dim("unassigned"),
    },
    {
      label: "Order",
      value: formatOrder(issue.labels) || dim("none"),
    },
    { label: "Labels", value: formatLabels(issue.labels) || dim("none") },
    { label: "Created", value: formatDate(issue.createdAt) },
    { label: "URL", value: dim(issue.url) },
  ]);

  process.stderr.write(`${details}\n`);

  // Body
  if (issue.body?.trim()) {
    process.stderr.write(
      `\n${dim("───────────────────────────────────────")}\n`
    );
    process.stderr.write(`${issue.body.trim()}\n`);
  }

  process.stderr.write("\n");
}

async function issueLabel(
  projectRoot: string,
  parsed: IssueArgs
): Promise<void> {
  // locus issue label 42 43 44 --sprint "Sprint 2"
  // locus issue label 42 --priority high
  // locus issue label 42 --type bug
  const issueNumbers = parsed.positional
    .filter((a) => /^\d+$/.test(a))
    .map(Number);

  if (issueNumbers.length === 0) {
    process.stderr.write(`${red("✗")} No issue numbers provided.\n`);
    process.stderr.write(
      `  Usage: ${bold('locus issue label <numbers...> [--sprint "Sprint"] [--priority high] [--type feature]')}\n`
    );
    process.exit(1);
  }

  const addLabels: string[] = [];
  const removeLabels: string[] = [];

  if (parsed.flags.priority) {
    const newLabel = `p:${parsed.flags.priority}`;
    addLabels.push(newLabel);
    // Remove other priority labels
    for (const l of PRIORITY_LABELS) {
      if (l.name !== newLabel) removeLabels.push(l.name);
    }
  }

  if (parsed.flags.type) {
    const newLabel = `type:${parsed.flags.type}`;
    addLabels.push(newLabel);
    for (const l of TYPE_LABELS) {
      if (l.name !== newLabel) removeLabels.push(l.name);
    }
  }

  if (parsed.flags.status) {
    const newLabel = `locus:${parsed.flags.status}`;
    addLabels.push(newLabel);
    for (const l of STATUS_LABELS) {
      if (l.name !== newLabel) removeLabels.push(l.name);
    }
  }

  // Handle sprint assignment
  if (parsed.flags.sprint) {
    for (const num of issueNumbers) {
      process.stderr.write(
        `${cyan("●")} Assigning #${num} to ${parsed.flags.sprint}...`
      );
      try {
        gh(
          `issue edit ${num} --milestone ${JSON.stringify(parsed.flags.sprint)}`,
          {
            cwd: projectRoot,
          }
        );
        process.stderr.write(
          `\r${green("✓")} #${num} → ${parsed.flags.sprint}\n`
        );
      } catch (e) {
        process.stderr.write(
          `\r${red("✗")} #${num}: ${(e as Error).message}\n`
        );
      }
    }
  }

  // Apply label changes
  if (addLabels.length > 0 || removeLabels.length > 0) {
    for (const num of issueNumbers) {
      process.stderr.write(`${cyan("●")} Updating labels on #${num}...`);
      try {
        updateIssueLabels(num, addLabels, removeLabels, { cwd: projectRoot });
        process.stderr.write(`\r${green("✓")} #${num} labels updated\n`);
      } catch (e) {
        process.stderr.write(
          `\r${red("✗")} #${num}: ${(e as Error).message}\n`
        );
      }
    }
  }

  if (
    addLabels.length === 0 &&
    removeLabels.length === 0 &&
    !parsed.flags.sprint
  ) {
    process.stderr.write(
      `${yellow("⚠")} No changes specified. Use --sprint, --priority, --type, or --status.\n`
    );
  }
}

async function issueClose(
  projectRoot: string,
  parsed: IssueArgs
): Promise<void> {
  const numberStr = parsed.positional[0];
  if (!numberStr || !/^\d+$/.test(numberStr)) {
    process.stderr.write(`${red("✗")} Missing or invalid issue number.\n`);
    process.stderr.write(
      `  Usage: ${bold("locus issue close <number> [--reason completed|not_planned]")}\n`
    );
    process.exit(1);
  }

  const number = Number.parseInt(numberStr, 10);
  const reason = parsed.flags.reason ?? "completed";

  process.stderr.write(`${cyan("●")} Closing issue #${number}...`);

  try {
    gh(`issue close ${number} --reason ${reason}`, { cwd: projectRoot });
    process.stderr.write(
      `\r${green("✓")} Closed issue #${number} (${reason})\n`
    );
  } catch (e) {
    process.stderr.write(`\r${red("✗")} ${(e as Error).message}\n`);
    process.exit(1);
  }
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

function formatPriority(labels: string[]): string {
  for (const label of labels) {
    if (label === "p:critical") return red("critical");
    if (label === "p:high") return yellow("high");
    if (label === "p:medium") return cyan("medium");
    if (label === "p:low") return dim("low");
  }
  return "";
}

function formatType(labels: string[]): string {
  for (const label of labels) {
    if (label === "type:feature") return blue("feature");
    if (label === "type:bug") return red("bug");
    if (label === "type:chore") return dim("chore");
    if (label === "type:refactor") return magenta("refactor");
    if (label === "type:docs") return green("docs");
  }
  return "";
}

function formatStatus(labels: string[]): string {
  for (const label of labels) {
    if (label === "locus:queued") return dim("queued");
    if (label === "locus:in-progress") return cyan("in-progress");
    if (label === "locus:in-review") return yellow("in-review");
    if (label === "locus:done") return green("done");
    if (label === "locus:failed") return red("failed");
  }
  return "";
}

function formatOrder(labels: string[]): string {
  for (const label of labels) {
    if (label.startsWith("order:")) {
      return bold(label.replace("order:", "#"));
    }
  }
  return "";
}

function formatLabels(labels: string[]): string {
  // Filter out known structured labels
  const custom = labels.filter(
    (l) =>
      !l.startsWith("p:") &&
      !l.startsWith("type:") &&
      !l.startsWith("locus:") &&
      !l.startsWith("order:") &&
      l !== "agent:managed"
  );
  if (custom.length === 0) return "";
  return custom.join(", ");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildFilterDescription(parsed: IssueArgs): string {
  const parts: string[] = [];
  if (parsed.flags.sprint) parts.push(`sprint: ${parsed.flags.sprint}`);
  if (parsed.flags.priority) parts.push(`priority: ${parsed.flags.priority}`);
  if (parsed.flags.status) parts.push(`status: ${parsed.flags.status}`);
  if (parsed.flags.mine) parts.push("assigned to me");
  if (parsed.flags.state && parsed.flags.state !== "open")
    parts.push(`state: ${parsed.flags.state}`);
  if (parsed.flags.label) parts.push(`label: ${parsed.flags.label}`);
  return parts.join(", ");
}

// ─── Help ────────────────────────────────────────────────────────────────────

function printIssueHelp(): void {
  process.stderr.write(`
${bold("locus issue")} — Manage GitHub issues as work items

${bold("Subcommands:")}
  ${cyan("create")} ${dim("(c)")}   Create a new issue via AI
  ${cyan("list")} ${dim("(ls)")}    List issues (default)
  ${cyan("show")}          Show issue details
  ${cyan("label")}         Bulk-update labels / sprint assignment
  ${cyan("close")}         Close an issue

${bold("Create options:")}
  ${dim("--sprint, -s")}   Assign to sprint (milestone)

${bold("List options:")}
  ${dim("--sprint, -s")}   Filter by sprint
  ${dim("--priority, -p")} Filter by priority
  ${dim("--status")}       Filter by locus status (queued, in-progress, done, failed)
  ${dim("--state")}        GitHub state: open, closed, all (default: open)
  ${dim("--mine, -m")}     Show only my issues
  ${dim("--label, -l")}    Filter by custom label
  ${dim("--limit, -n")}    Max results (default: 50)

${bold("Examples:")}
  locus issue create "Add dark mode support"
  locus issue create "Fix login bug" --sprint "Sprint 1"
  locus issue create  ${dim("# interactive prompt")}
  locus issue list --sprint "Sprint 1" --status queued
  locus issue show 42
  locus issue label 42 43 --sprint "Sprint 2"
  locus issue close 42

`);
}
