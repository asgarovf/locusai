/**
 * `locus config` — View and update local settings.
 *
 * Usage:
 *   locus config show                    — Display current config
 *   locus config set ai.model gpt-5.3-codex   — Set a value
 *   locus config get ai.model                 — Get a value
 */

import {
  getNestedValue,
  loadConfig,
  updateConfigValue,
} from "../core/config.js";
import { bold, cyan, dim, gray, green, yellow } from "../display/terminal.js";

export async function configCommand(
  cwd: string,
  args: string[]
): Promise<void> {
  const subcommand = args[0] ?? "show";

  switch (subcommand) {
    case "show":
      return showConfig(cwd);
    case "set":
      return setConfig(cwd, args.slice(1));
    case "get":
      return getConfig(cwd, args.slice(1));
    default:
      process.stderr.write(`Unknown config subcommand: ${bold(subcommand)}\n`);
      process.stderr.write(`\nUsage:\n`);
      process.stderr.write(
        `  ${bold("locus config show")}              Display current config\n`
      );
      process.stderr.write(
        `  ${bold("locus config set")} ${dim("<path> <value>")}  Set a value\n`
      );
      process.stderr.write(
        `  ${bold("locus config get")} ${dim("<path>")}          Get a value\n`
      );
      process.exit(1);
  }
}

function showConfig(cwd: string): void {
  const config = loadConfig(cwd);

  process.stderr.write(`\n${bold("Locus Configuration")}\n\n`);

  const sections = [
    {
      title: "GitHub",
      entries: [
        ["Owner", config.github.owner],
        ["Repo", config.github.repo],
        ["Default Branch", config.github.defaultBranch],
      ],
    },
    {
      title: "AI",
      entries: [
        ["Provider", config.ai.provider],
        ["Model", config.ai.model],
      ],
    },
    {
      title: "Agent",
      entries: [
        ["Max Parallel", String(config.agent.maxParallel)],
        ["Auto Label", String(config.agent.autoLabel)],
        ["Auto PR", String(config.agent.autoPR)],
        ["Base Branch", config.agent.baseBranch],
        ["Rebase Before Task", String(config.agent.rebaseBeforeTask)],
      ],
    },
    {
      title: "Sprint",
      entries: [
        ["Active", config.sprint.active ?? dim("(none)")],
        ["Stop on Failure", String(config.sprint.stopOnFailure)],
      ],
    },
    {
      title: "Logging",
      entries: [
        ["Level", config.logging.level],
        ["Max Files", String(config.logging.maxFiles)],
        ["Max Total Size", `${config.logging.maxTotalSizeMB} MB`],
      ],
    },
  ];

  for (const section of sections) {
    process.stderr.write(`  ${cyan(bold(section.title))}\n`);
    for (const [key, value] of section.entries) {
      process.stderr.write(`    ${gray(key.padEnd(20))} ${value}\n`);
    }
    process.stderr.write("\n");
  }
}

function setConfig(cwd: string, args: string[]): void {
  if (args.length < 2) {
    process.stderr.write(
      `Usage: ${bold("locus config set")} ${dim("<path> <value>")}\n`
    );
    process.stderr.write(`\nExamples:\n`);
    process.stderr.write(`  locus config set ai.model gpt-5.3-codex\n`);
    process.stderr.write(`  locus config set ai.model claude-sonnet-4-6\n`);
    process.stderr.write(`  locus config set agent.maxParallel 5\n`);
    process.exit(1);
  }

  const [path, ...valueParts] = args;
  const value = valueParts.join(" ");

  const config = updateConfigValue(cwd, path, value);
  const actual = getNestedValue(config, path);

  process.stderr.write(
    `${green("✓")} Set ${bold(path)} = ${bold(String(actual))}\n`
  );
}

function getConfig(cwd: string, args: string[]): void {
  if (args.length < 1) {
    process.stderr.write(
      `Usage: ${bold("locus config get")} ${dim("<path>")}\n`
    );
    process.exit(1);
  }

  const [path] = args;
  const config = loadConfig(cwd);
  const value = getNestedValue(config, path);

  if (value === undefined) {
    process.stderr.write(`${yellow("⚠")} No value at path: ${bold(path)}\n`);
    process.exit(1);
  }

  // Output to stdout (for scripting)
  process.stdout.write(
    typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)
  );
  process.stdout.write("\n");
}
