/**
 * Issues list command for locus-linear.
 *
 * Lists issues from the configured team with optional cycle filtering and pagination.
 *
 * Usage:
 *   locus pkg linear issues                → list all team issues
 *   locus pkg linear issues --cycle        → list issues in active cycle
 *   locus pkg linear issues --limit 25     → limit number of results
 */

import { LocusLinearClient } from "../client.js";
import { loadLinearConfig, validateLinearConfig } from "../config.js";
import { mapPriority } from "../sync/mapper.js";

interface IssuesOptions {
  cycle?: boolean;
  limit: number;
}

export async function issuesCommand(args: string[]): Promise<void> {
  const options = parseIssuesArgs(args);

  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    process.stderr.write(`\n  ${configError}\n\n`);
    process.exit(1);
  }

  const client = LocusLinearClient.fromConfig();
  const linearClient = await client.ensureFreshClient();

  // Resolve team
  const teamsConnection = await linearClient.teams();
  const team = teamsConnection.nodes.find((t) => t.key === config.teamKey);
  if (!team) {
    process.stderr.write(
      `\n  Team "${config.teamKey}" not found. Run: locus pkg linear team <KEY>\n\n`
    );
    process.exit(1);
  }

  // Resolve cycle filter
  let cycleId: string | undefined;
  let cycleName = "";
  if (options.cycle) {
    const cyclesConnection = await team.cycles({
      filter: { isActive: { eq: true } },
    });
    const activeCycle = cyclesConnection.nodes[0];
    if (!activeCycle) {
      process.stderr.write("\n  No active cycle found for this team.\n\n");
      process.exit(1);
    }
    cycleId = activeCycle.id;
    cycleName = activeCycle.name ?? `Cycle ${activeCycle.number}`;
  }

  // Build filter
  const filter: Record<string, unknown> = {
    team: { id: { eq: team.id } },
  };
  if (cycleId) {
    filter.cycle = { id: { eq: cycleId } };
  }

  // Fetch issues (paginated up to limit)
  const issues: Array<{
    identifier: string;
    title: string;
    state: string;
    priority: string;
    assignee: string;
  }> = [];

  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore && issues.length < options.limit) {
    const remaining = options.limit - issues.length;
    const pageSize = Math.min(50, remaining);

    const variables: Record<string, unknown> = {
      first: pageSize,
      filter,
    };
    if (cursor) {
      variables.after = cursor;
    }

    const connection = await client.getIssues(variables);

    for (const node of connection.nodes) {
      if (issues.length >= options.limit) break;

      const stateObj = await node.state;
      const assignee = await node.assignee;

      issues.push({
        identifier: node.identifier,
        title: node.title,
        state: stateObj?.name ?? "Unknown",
        priority: mapPriority(node.priority),
        assignee: assignee?.name ?? "-",
      });
    }

    const pageInfo = connection.pageInfo;
    hasMore = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor ?? undefined;
  }

  // Print header
  const header = options.cycle
    ? `${team.name} (${team.key}) — ${cycleName}`
    : `${team.name} (${team.key})`;

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
    `  ${"ID".padEnd(12)} ${"Title".padEnd(40)} ${"State".padEnd(14)} ${"Priority".padEnd(12)} Assignee\n`
  );
  process.stderr.write(
    `  ${"─".repeat(12)} ${"─".repeat(40)} ${"─".repeat(14)} ${"─".repeat(12)} ${"─".repeat(10)}\n`
  );

  for (const issue of issues) {
    const title =
      issue.title.length > 38 ? `${issue.title.slice(0, 35)}...` : issue.title;
    const assignee =
      issue.assignee.length > 10
        ? `${issue.assignee.slice(0, 7)}...`
        : issue.assignee;

    process.stderr.write(
      `  ${issue.identifier.padEnd(12)} ${title.padEnd(40)} ${issue.state.padEnd(14)} ${issue.priority.padEnd(12)} ${assignee}\n`
    );
  }

  process.stderr.write("\n");
}

function parseIssuesArgs(args: string[]): IssuesOptions {
  const options: IssuesOptions = { limit: 50 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--cycle":
        options.cycle = true;
        break;
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
