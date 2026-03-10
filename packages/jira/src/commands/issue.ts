/**
 * Single issue detail command for locus-jira.
 *
 * Displays full details for a single Jira issue.
 *
 * Usage:
 *   locus jira issue PROJ-123    → show full issue details
 */

import { adfToMarkdown } from "../client/adf-to-md.js";
import { JiraClient } from "../client/client.js";
import type { ADFNode, JiraComment } from "../client/types.js";
import { loadJiraConfig } from "../config.js";

export async function issueCommand(args: string[]): Promise<void> {
  const key = args[0];

  if (!key || key.startsWith("--")) {
    process.stderr.write(
      "\n  Usage: locus jira issue <KEY>\n  Example: locus jira issue PROJ-123\n\n"
    );
    process.exit(1);
  }

  const config = loadJiraConfig();
  const client = JiraClient.fromConfig();

  process.stderr.write(`\n  Fetching ${key}...\n`);
  const issue = await client.getIssue(key.toUpperCase());

  const f = issue.fields;

  // Header
  process.stderr.write("\n");
  process.stderr.write(`  ${issue.key}: ${f.summary}\n`);
  process.stderr.write(`  ${"═".repeat(70)}\n\n`);

  // Metadata
  process.stderr.write(`  Type:        ${f.issuetype.name}\n`);
  process.stderr.write(`  Status:      ${f.status.name}\n`);
  process.stderr.write(`  Priority:    ${f.priority?.name ?? "-"}\n`);
  process.stderr.write(
    `  Assignee:    ${f.assignee?.displayName ?? "Unassigned"}\n`
  );
  process.stderr.write(`  Reporter:    ${f.reporter?.displayName ?? "-"}\n`);

  if (f.labels.length > 0) {
    process.stderr.write(`  Labels:      ${f.labels.join(", ")}\n`);
  }

  if (f.sprint) {
    process.stderr.write(`  Sprint:      ${f.sprint.name}\n`);
  }

  if (f.parent) {
    process.stderr.write(`  Parent:      ${f.parent.key}\n`);
  }

  process.stderr.write(`  Project:     ${f.project.key} — ${f.project.name}\n`);
  process.stderr.write(`  Created:     ${f.created.split("T")[0]}\n`);
  process.stderr.write(`  Updated:     ${f.updated.split("T")[0]}\n`);

  // URL
  if (config.auth) {
    const baseUrl =
      config.auth.method === "oauth"
        ? `https://api.atlassian.com/ex/jira/${config.auth.cloudId}`
        : config.auth.baseUrl;
    process.stderr.write(`  URL:         ${baseUrl}/browse/${issue.key}\n`);
  }

  // Description
  if (f.description) {
    process.stderr.write(`\n  ${"─".repeat(70)}\n`);
    process.stderr.write("  Description:\n\n");

    const markdown =
      typeof f.description === "string"
        ? f.description
        : adfToMarkdown(f.description as ADFNode);

    const lines = markdown.split("\n");
    for (const line of lines) {
      process.stderr.write(`    ${line}\n`);
    }
  }

  // Comments
  const commentData = f.comment;
  if (commentData?.comments && commentData.comments.length > 0) {
    process.stderr.write(`\n  ${"─".repeat(70)}\n`);
    process.stderr.write(`  Comments (${commentData.total}):\n\n`);

    const recent = commentData.comments.slice(-5);
    for (const comment of recent) {
      formatComment(comment);
    }
  }

  process.stderr.write("\n");
}

function formatComment(comment: JiraComment): void {
  const date = comment.created.split("T")[0] ?? comment.created;
  const author = comment.author?.displayName ?? "System";

  const body =
    typeof comment.body === "string"
      ? comment.body
      : adfToMarkdown(comment.body);

  process.stderr.write(`  [${date}] ${author}:\n`);
  const lines = body.split("\n");
  for (const line of lines) {
    process.stderr.write(`    ${line}\n`);
  }
  process.stderr.write("\n");
}
