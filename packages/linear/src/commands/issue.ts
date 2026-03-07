/**
 * Single issue detail command for locus-linear.
 *
 * Displays full details for a single Linear issue, including sync status.
 *
 * Usage:
 *   locus pkg linear issue ENG-123    → show full issue details
 */

import { LocusLinearClient } from "../client.js";
import { loadLinearConfig, validateLinearConfig } from "../config.js";
import { mapPriority } from "../sync/mapper.js";
import { loadState } from "../sync/state.js";

export async function issueCommand(args: string[]): Promise<void> {
  const identifier = args[0];

  if (!identifier || identifier.startsWith("--")) {
    process.stderr.write(
      "\n  Usage: locus pkg linear issue <ID>\n  Example: locus pkg linear issue ENG-123\n\n"
    );
    process.exit(1);
  }

  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    process.stderr.write(`\n  ${configError}\n\n`);
    process.exit(1);
  }

  const client = LocusLinearClient.fromConfig();

  // Search for the issue by identifier
  const connection = await client.getIssues({
    first: 1,
    filter: {
      team: { key: { eq: identifier.split("-")[0] } },
      number: { eq: Number.parseInt(identifier.split("-")[1], 10) },
    },
  });

  const node = connection.nodes[0];
  if (!node) {
    process.stderr.write(`\n  Issue "${identifier}" not found.\n\n`);
    process.exit(1);
  }

  // Resolve related data
  const stateObj = await node.state;
  const labelsConnection = await node.labels();
  const labelNames = labelsConnection.nodes.map((l) => l.name);
  const assignee = await node.assignee;
  const cycle = await node.cycle;
  const project = await node.project;
  const parent = await node.parent;
  const children = await node.children();

  // Check sync status
  const syncState = loadState();
  const mapping = syncState.mappings.find(
    (m) => m.linearIdentifier === identifier
  );

  // Print details
  process.stderr.write("\n");
  process.stderr.write(`  ${node.identifier}: ${node.title}\n`);
  process.stderr.write(`  ${"═".repeat(70)}\n\n`);

  const priorityLabel = mapPriority(node.priority);
  const stateName = stateObj?.name ?? "Unknown";

  process.stderr.write(`  State:       ${stateName}\n`);
  process.stderr.write(`  Priority:    ${priorityLabel}\n`);
  process.stderr.write(`  Assignee:    ${assignee?.name ?? "Unassigned"}\n`);

  if (labelNames.length > 0) {
    process.stderr.write(`  Labels:      ${labelNames.join(", ")}\n`);
  }

  if (cycle) {
    const cycleName = cycle.name ?? `Cycle ${cycle.number}`;
    process.stderr.write(`  Cycle:       ${cycleName}\n`);
  }

  if (project) {
    process.stderr.write(`  Project:     ${project.name}\n`);
  }

  if (parent) {
    process.stderr.write(
      `  Parent:      ${parent.identifier}: ${parent.title}\n`
    );
  }

  if (children.nodes.length > 0) {
    process.stderr.write(`  Sub-issues:  ${children.nodes.length}\n`);
    for (const child of children.nodes) {
      const childState = await child.state;
      process.stderr.write(
        `               ${child.identifier}: ${child.title} [${childState?.name ?? "Unknown"}]\n`
      );
    }
  }

  const comments = await node.comments();
  process.stderr.write(`  Comments:    ${comments.nodes.length}\n`);

  process.stderr.write(`  URL:         ${node.url}\n`);
  process.stderr.write(
    `  Created:     ${node.createdAt.toISOString().split("T")[0]}\n`
  );
  process.stderr.write(
    `  Updated:     ${node.updatedAt.toISOString().split("T")[0]}\n`
  );

  // Sync status
  process.stderr.write(`\n  ${"─".repeat(70)}\n`);
  if (mapping) {
    process.stderr.write(
      `  Sync:        Imported as GitHub Issue #${mapping.githubIssueNumber}\n`
    );
    process.stderr.write(
      `  Last synced: ${mapping.lastSyncedAt.split("T")[0]}\n`
    );
  } else {
    process.stderr.write(
      "  Sync:        Not imported (no GitHub Issue linked)\n"
    );
  }

  // Description
  if (node.description) {
    process.stderr.write(`\n  ${"─".repeat(70)}\n`);
    process.stderr.write("  Description:\n\n");
    const lines = node.description.split("\n");
    for (const line of lines) {
      process.stderr.write(`    ${line}\n`);
    }
  }

  process.stderr.write("\n");
}
