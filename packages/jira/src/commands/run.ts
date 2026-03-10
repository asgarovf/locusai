/**
 * Run command for locus-jira.
 *
 * Fetches Jira issues and executes them via Locus's `invokeLocus` SDK function.
 *
 * Usage:
 *   locus jira run PROJ-101 PROJ-102       → run specific issues by key
 *   locus jira run --jql "..."             → run issues matching JQL
 *   locus jira run --sprint                → run active sprint issues
 *   locus jira run --sprint --status "To Do" → filter sprint issues by status
 *   locus jira run --dry-run               → preview without executing
 *   locus jira run --sync                  → sync status back to Jira after execution
 */

import { invokeLocus } from "@locusai/sdk";
import { JiraClient } from "../client/client.js";
import type { JiraIssue } from "../client/types.js";
import { loadJiraConfig } from "../config.js";
import type { LocusIssue } from "../mapper.js";
import { mapJiraIssue } from "../mapper.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RunOptions {
  keys: string[];
  jql?: string;
  sprint?: boolean;
  status?: string;
  dryRun?: boolean;
  sync?: boolean;
}

interface RunResult {
  issueKey: string;
  title: string;
  success: boolean;
  error?: string;
}

// ─── Arg Parsing ────────────────────────────────────────────────────────────

function parseRunArgs(args: string[]): RunOptions {
  const options: RunOptions = { keys: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--jql": {
        const next = args[i + 1];
        if (!next || next.startsWith("--")) {
          process.stderr.write("  --jql requires a query string.\n");
          process.exit(1);
        }
        options.jql = next;
        i++;
        break;
      }
      case "--sprint":
        options.sprint = true;
        break;
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
        // Positional args are issue keys
        options.keys.push(arg.toUpperCase());
    }
  }

  return options;
}

// ─── Issue Fetching ─────────────────────────────────────────────────────────

async function fetchIssuesByKeys(
  client: JiraClient,
  keys: string[]
): Promise<JiraIssue[]> {
  const issues: JiraIssue[] = [];
  for (const key of keys) {
    process.stderr.write(`  Fetching ${key}...\n`);
    const issue = await client.getIssue(key);
    issues.push(issue);
  }
  return issues;
}

async function fetchIssuesByJql(
  client: JiraClient,
  jql: string
): Promise<JiraIssue[]> {
  process.stderr.write(`  Searching: ${jql}\n`);
  const result = await client.searchIssues(jql, { fetchAll: true });
  return result.issues;
}

async function fetchSprintIssues(
  client: JiraClient,
  boardId: number,
  status?: string
): Promise<JiraIssue[]> {
  process.stderr.write("  Fetching active sprint...\n");
  const sprint = await client.getCurrentSprint(boardId);
  if (!sprint) {
    process.stderr.write("  No active sprint found.\n\n");
    return [];
  }

  process.stderr.write(`  Sprint: ${sprint.name}\n`);
  const issues = await client.getSprintIssues(boardId, sprint.id);

  if (status) {
    const normalized = status.toLowerCase();
    return issues.filter(
      (i) => i.fields.status.name.toLowerCase() === normalized
    );
  }

  return issues;
}

// ─── Issue Execution ────────────────────────────────────────────────────────

function buildExecPrompt(issue: LocusIssue): string {
  const parts = [`# ${issue.id}: ${issue.title}`, ""];

  if (issue.description) {
    parts.push(issue.description, "");
  }

  if (issue.labels.length > 0) {
    parts.push(`Labels: ${issue.labels.join(", ")}`, "");
  }

  if (issue.priority) {
    parts.push(`Priority: ${issue.priority}`, "");
  }

  if (issue.comments && issue.comments.length > 0) {
    parts.push("## Comments", "");
    for (const comment of issue.comments) {
      parts.push(`- ${comment}`);
    }
    parts.push("");
  }

  parts.push(`Source: ${issue.url}`);

  return parts.join("\n");
}

async function executeIssue(issue: LocusIssue): Promise<RunResult> {
  const prompt = buildExecPrompt(issue);

  process.stderr.write(`  Executing ${issue.id}: ${issue.title}...\n`);

  const result = await invokeLocus(["exec", prompt]);

  if (result.exitCode !== 0) {
    return {
      issueKey: issue.id,
      title: issue.title,
      success: false,
      error: result.stderr.trim() || `Exit code: ${result.exitCode}`,
    };
  }

  return {
    issueKey: issue.id,
    title: issue.title,
    success: true,
  };
}

// ─── Dry Run ────────────────────────────────────────────────────────────────

function printDryRun(issues: LocusIssue[]): void {
  process.stderr.write(
    `\n  Dry run — ${issues.length} issue(s) would execute:\n`
  );
  process.stderr.write(`  ${"═".repeat(70)}\n`);

  for (const issue of issues) {
    const desc =
      issue.description.length > 60
        ? `${issue.description.slice(0, 57)}...`
        : issue.description;
    process.stderr.write(`  ${issue.id.padEnd(14)} ${issue.title}\n`);
    if (desc) {
      process.stderr.write(`  ${"".padEnd(14)} ${desc}\n`);
    }
  }

  process.stderr.write("\n");
}

// ─── Results Summary ────────────────────────────────────────────────────────

function printResults(results: RunResult[]): void {
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  process.stderr.write(`\n  ${"═".repeat(70)}\n`);
  process.stderr.write("  Execution Summary\n");
  process.stderr.write(`  ${"─".repeat(70)}\n`);

  for (const r of results) {
    const icon = r.success ? "+" : "x";
    const status = r.success ? "OK" : "FAILED";
    process.stderr.write(
      `  [${icon}] ${r.issueKey.padEnd(14)} ${status}${r.error ? ` — ${r.error}` : ""}\n`
    );
  }

  process.stderr.write(`  ${"─".repeat(70)}\n`);
  process.stderr.write(
    `  Total: ${results.length}  |  Succeeded: ${succeeded.length}  |  Failed: ${failed.length}\n\n`
  );
}

// ─── Sync Back ──────────────────────────────────────────────────────────────

async function syncResults(
  client: JiraClient,
  results: RunResult[]
): Promise<void> {
  const succeeded = results.filter((r) => r.success);
  if (succeeded.length === 0) return;

  process.stderr.write("  Syncing results back to Jira...\n");

  for (const r of succeeded) {
    try {
      await client.addComment(
        r.issueKey,
        `Locus executed this issue successfully.`
      );
    } catch {
      process.stderr.write(
        `  Warning: Could not add comment to ${r.issueKey}\n`
      );
    }
  }

  process.stderr.write("  Sync complete.\n\n");
}

// ─── Command Entry ──────────────────────────────────────────────────────────

export async function runCommand(args: string[]): Promise<void> {
  const options = parseRunArgs(args);
  const config = loadJiraConfig();
  const client = JiraClient.fromConfig();

  // Fetch issues based on mode
  let jiraIssues: JiraIssue[];

  if (options.keys.length > 0) {
    // Explicit issue keys
    jiraIssues = await fetchIssuesByKeys(client, options.keys);
  } else if (options.jql) {
    // JQL query
    jiraIssues = await fetchIssuesByJql(client, options.jql);
  } else if (options.sprint) {
    // Sprint mode
    if (!config.boardId) {
      process.stderr.write(
        "\n  No board configured. Run: locus jira board\n\n"
      );
      process.exit(1);
    }
    jiraIssues = await fetchSprintIssues(
      client,
      config.boardId,
      options.status
    );
  } else {
    process.stderr.write(
      "\n  Usage: locus jira run <KEY...> | --jql <query> | --sprint\n" +
        "  Run 'locus jira run --help' for details.\n\n"
    );
    process.exit(1);
  }

  if (jiraIssues.length === 0) {
    process.stderr.write("\n  No issues found.\n\n");
    return;
  }

  // Enforce maxIssuesPerRun limit
  const limit = config.maxIssuesPerRun;
  if (jiraIssues.length > limit) {
    process.stderr.write(
      `\n  Warning: Found ${jiraIssues.length} issues but maxIssuesPerRun is ${limit}. ` +
        `Only the first ${limit} will be processed.\n`
    );
    jiraIssues = jiraIssues.slice(0, limit);
  }

  // Map to LocusIssue format
  const locusIssues = jiraIssues.map((ji) => mapJiraIssue(ji, config));

  process.stderr.write(`\n  ${locusIssues.length} issue(s) to execute\n`);

  // Dry run mode
  if (options.dryRun) {
    printDryRun(locusIssues);
    return;
  }

  // Execute issues sequentially
  process.stderr.write(`  ${"─".repeat(70)}\n`);
  const results: RunResult[] = [];

  for (const issue of locusIssues) {
    const result = await executeIssue(issue);
    results.push(result);
  }

  printResults(results);

  // Sync back to Jira if requested
  if (options.sync) {
    await syncResults(client, results);
  }
}
