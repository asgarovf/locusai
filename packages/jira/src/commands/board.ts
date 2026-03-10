/**
 * Board command for locus-jira.
 *
 * - `locus jira board`    → list available boards and prompt for selection
 */

import { prompt } from "../auth/prompt.js";
import { JiraClient } from "../client/client.js";
import { loadJiraConfig, saveJiraConfig } from "../config.js";

export async function boardCommand(args: string[]): Promise<void> {
  const idArg = args[0];

  if (idArg && !idArg.startsWith("--")) {
    const boardId = Number.parseInt(idArg, 10);
    if (Number.isNaN(boardId)) {
      process.stderr.write(`  Invalid board ID: ${idArg}\n\n`);
      process.exit(1);
    }
    saveJiraConfig({ boardId });
    process.stderr.write(`\n  Active board set to: ${boardId}\n\n`);
    return;
  }

  return selectBoard();
}

async function selectBoard(): Promise<void> {
  const config = loadJiraConfig();
  if (config.boardId) {
    process.stderr.write(`\n  Current board ID: ${config.boardId}\n`);
  }

  const client = JiraClient.fromConfig();

  process.stderr.write("\n  Fetching boards...\n");
  const boards = await client.getBoards();

  if (boards.length === 0) {
    process.stderr.write("  No boards found.\n\n");
    return;
  }

  process.stderr.write(`\n  Available boards (${boards.length}):\n`);
  process.stderr.write(`  ${"─".repeat(70)}\n`);
  process.stderr.write(
    `  ${"#".padStart(3)}  ${"Name".padEnd(30)} ${"Type".padEnd(10)} Project\n`
  );
  process.stderr.write(
    `  ${"─".repeat(3)}  ${"─".repeat(30)} ${"─".repeat(10)} ${"─".repeat(20)}\n`
  );

  for (let i = 0; i < boards.length; i++) {
    const b = boards[i];
    const name = b.name.length > 28 ? `${b.name.slice(0, 25)}...` : b.name;
    const project = b.location?.projectKey ?? "-";

    process.stderr.write(
      `  ${String(i + 1).padStart(3)}) ${name.padEnd(30)} ${b.type.padEnd(10)} ${project}\n`
    );
  }

  process.stderr.write("\n");
  const choice = await prompt("  Select board (number): ");

  if (!choice) {
    process.stderr.write("  No selection made.\n\n");
    return;
  }

  const num = Number.parseInt(choice, 10);
  if (Number.isNaN(num) || num < 1 || num > boards.length) {
    process.stderr.write(`  Invalid selection: ${choice}\n\n`);
    process.exit(1);
  }

  const selected = boards[num - 1];
  saveJiraConfig({ boardId: selected.id });
  process.stderr.write(
    `\n  Active board set to: ${selected.name} (ID: ${selected.id}, ${selected.type})\n\n`
  );
}
