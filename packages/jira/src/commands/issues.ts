/**
 * Issues list command for locus-jira.
 *
 * Lists issues with tabular output.
 *
 * Usage:
 *   locus jira issues                     → list project issues (default JQL)
 *   locus jira issues --jql "..."         → custom JQL filter
 *   locus jira issues --sprint            → show active sprint issues
 *   locus jira issues --limit 10          → limit results
 */

import { JiraClient } from "../client/client.js";
import type { JiraIssue } from "../client/types.js";
import { loadJiraConfig } from "../config.js";

interface IssuesOptions {
  jql?: string;
  sprint?: boolean;
  limit: number;
}

export async function issuesCommand(args: string[]): Promise<void> {
  const options = parseIssuesArgs(args);
  const config = loadJiraConfig();
  const client = JiraClient.fromConfig();

  let issues: JiraIssue[];
  let header: string;

  if (options.sprint) {
    // Sprint mode — requires boardId
    if (!config.boardId) {
      process.stderr.write(
        "\n  No board configured. Run: locus jira board\n\n"
      );
      process.exit(1);
    }

    process.stderr.write("\n  Fetching active sprint...\n");
    const sprint = await client.getCurrentSprint(config.boardId);
    if (!sprint) {
      process.stderr.write("  No active sprint found.\n\n");
      return;
    }

    header = `Sprint: ${sprint.name}`;
    const sprintIssues = await client.getSprintIssues(
      config.boardId,
      sprint.id
    );
    issues = sprintIssues.slice(0, options.limit);
  } else {
    // JQL mode
    const jql =
      options.jql ??
      config.defaultJql ??
      (config.projectKey
        ? `project = ${config.projectKey} ORDER BY updated DESC`
        : null);

    if (!jql) {
      process.stderr.write(
        "\n  No project configured and no --jql provided.\n  Run: locus jira project <KEY>\n\n"
      );
      process.exit(1);
    }

    header = options.jql
      ? `JQL: ${jql}`
      : `Project: ${config.projectKey ?? "all"}`;

    process.stderr.write("\n  Fetching issues...\n");
    const result = await client.searchIssues(jql, {
      maxResults: options.limit,
    });
    issues = result.issues;
  }

  // Print header
  process.stderr.write(`\n  ${header}\n`);
  process.stderr.write(
    `  ${issues.length} issue${issues.length === 1 ? "" : "s"}\n`
  );
  process.stderr.write(`  ${"═".repeat(90)}\n`);

  if (issues.length === 0) {
    process.stderr.write("  No issues found.\n\n");
    return;
  }

  // Table header
  process.stderr.write(
    `  ${"Key".padEnd(14)} ${"Summary".padEnd(38)} ${"Status".padEnd(14)} ${"Priority".padEnd(10)} Assignee\n`
  );
  process.stderr.write(
    `  ${"─".repeat(14)} ${"─".repeat(38)} ${"─".repeat(14)} ${"─".repeat(10)} ${"─".repeat(12)}\n`
  );

  for (const issue of issues) {
    const key = issue.key ?? "-";
    const rawSummary = issue.fields?.summary ?? "(no summary)";
    const summary =
      rawSummary.length > 36
        ? `${rawSummary.slice(0, 33)}...`
        : rawSummary;
    const status = issue.fields?.status?.name ?? "-";
    const priority = issue.fields?.priority?.name ?? "-";
    const assignee = issue.fields?.assignee?.displayName ?? "-";
    const assigneeDisplay =
      assignee.length > 12 ? `${assignee.slice(0, 9)}...` : assignee;

    process.stderr.write(
      `  ${key.padEnd(14)} ${summary.padEnd(38)} ${status.padEnd(14)} ${priority.padEnd(10)} ${assigneeDisplay}\n`
    );
  }

  process.stderr.write("\n");
}

function parseIssuesArgs(args: string[]): IssuesOptions {
  const options: IssuesOptions = { limit: 25 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--sprint":
        options.sprint = true;
        break;
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
      case "--limit": {
        const next = args[i + 1];
        if (!next || next.startsWith("--")) {
          process.stderr.write("  --limit requires a number.\n");
          process.exit(1);
        }
        const num = Number.parseInt(next, 10);
        if (Number.isNaN(num) || num <= 0) {
          process.stderr.write("  --limit must be a positive number.\n");
          process.exit(1);
        }
        options.limit = num;
        i++;
        break;
      }
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`  Unknown flag: ${arg}\n`);
          process.exit(1);
        }
    }
  }

  return options;
}
