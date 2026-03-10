/**
 * Project command for locus-jira.
 *
 * - `locus jira project`         → list available projects and prompt for selection
 * - `locus jira project ENG`     → set project key directly
 */

import { prompt } from "../auth/prompt.js";
import { JiraClient } from "../client/client.js";
import { loadJiraConfig, saveJiraConfig } from "../config.js";

export async function projectCommand(args: string[]): Promise<void> {
  const key = args[0];

  if (key && !key.startsWith("--")) {
    setProject(key);
    return;
  }

  return selectProject();
}

function setProject(key: string): void {
  const normalized = key.toUpperCase();
  saveJiraConfig({ projectKey: normalized });
  process.stderr.write(`\n  Active project set to: ${normalized}\n\n`);
}

async function selectProject(): Promise<void> {
  const config = loadJiraConfig();
  if (config.projectKey) {
    process.stderr.write(`\n  Current project: ${config.projectKey}\n`);
  }

  const client = JiraClient.fromConfig();

  process.stderr.write("\n  Fetching projects...\n");
  const projects = await client.getProjects();

  if (projects.length === 0) {
    process.stderr.write("  No projects found.\n\n");
    return;
  }

  process.stderr.write(`\n  Available projects (${projects.length}):\n`);
  process.stderr.write(`  ${"─".repeat(60)}\n`);

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    process.stderr.write(
      `  ${String(i + 1).padStart(3)}) ${p.key.padEnd(12)} ${p.name}\n`
    );
  }

  process.stderr.write("\n");
  const choice = await prompt("  Select project (number or key): ");

  if (!choice) {
    process.stderr.write("  No selection made.\n\n");
    return;
  }

  // Try as number first
  const num = Number.parseInt(choice, 10);
  let selected: (typeof projects)[0] | undefined;

  if (!Number.isNaN(num) && num >= 1 && num <= projects.length) {
    selected = projects[num - 1];
  } else {
    // Try as key
    const upper = choice.toUpperCase();
    selected = projects.find((p) => p.key.toUpperCase() === upper);
  }

  if (!selected) {
    process.stderr.write(`  Invalid selection: ${choice}\n\n`);
    process.exit(1);
  }

  saveJiraConfig({ projectKey: selected.key });
  process.stderr.write(
    `\n  Active project set to: ${selected.key} (${selected.name})\n\n`
  );
}
