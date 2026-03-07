/**
 * Import command for locus-linear.
 *
 * Fetches issues from Linear and creates/updates corresponding GitHub Issues.
 *
 * Usage:
 *   locus pkg linear import                  → import all matching issues
 *   locus pkg linear import --cycle          → import from active cycle only
 *   locus pkg linear import --project "Name" → import from specific project
 *   locus pkg linear import --dry-run        → preview without creating issues
 */

import { createLogger } from "@locusai/sdk";
import { loadLinearConfig, validateLinearConfig } from "../config.js";
import { handleCommandError } from "../errors.js";
import { runImport, type ImportOptions, type ImportResult } from "../sync/importer.js";

const logger = createLogger("linear");

export async function importCommand(args: string[]): Promise<void> {
  const options = parseImportArgs(args);

  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    process.stderr.write(`\n  ${configError}\n\n`);
    process.exit(1);
  }

  if (options.dryRun) {
    process.stderr.write("\n  Dry run — no GitHub issues will be created or updated.\n\n");
  }

  process.stderr.write("  Fetching issues from Linear...\n");

  let result: ImportResult;
  try {
    result = await runImport(options);
  } catch (err) {
    handleCommandError(err);
  }

  printResults(result, options.dryRun ?? false);
}

function parseImportArgs(args: string[]): ImportOptions {
  const options: ImportOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--cycle":
        options.cycle = true;
        break;
      case "--project": {
        const next = args[i + 1];
        if (!next || next.startsWith("--")) {
          process.stderr.write("  --project requires a project name.\n");
          process.exit(1);
        }
        options.project = next;
        i++;
        break;
      }
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--enrich":
        options.enrich = true;
        break;
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`  Unknown flag: ${arg}\n`);
          process.exit(1);
        }
    }
  }

  return options;
}

function printResults(result: ImportResult, dryRun: boolean): void {
  const prefix = dryRun ? "Would have" : "";
  const total = result.created + result.updated + result.skipped + result.errors;

  process.stderr.write("\n  Import Summary\n");
  process.stderr.write(`  ${"─".repeat(50)}\n`);

  if (result.issues.length > 0) {
    process.stderr.write(`\n  ${"Action".padEnd(10)} ${"Issue".padEnd(15)} Title\n`);
    process.stderr.write(`  ${"─".repeat(10)} ${"─".repeat(15)} ${"─".repeat(40)}\n`);

    for (const issue of result.issues) {
      const action = issue.action === "error"
        ? "ERROR"
        : dryRun
          ? `${issue.action}*`
          : issue.action;
      const ghRef = issue.githubNumber ? `#${issue.githubNumber}` : "";
      const title = issue.title.length > 40
        ? `${issue.title.slice(0, 37)}...`
        : issue.title;

      process.stderr.write(
        `  ${action.padEnd(10)} ${issue.identifier.padEnd(15)} ${title}`
      );
      if (ghRef) {
        process.stderr.write(` → ${ghRef}`);
      }
      if (issue.error) {
        process.stderr.write(` (${issue.error})`);
      }
      process.stderr.write("\n");
    }
  }

  process.stderr.write(`\n  ${prefix} Created: ${result.created}`);
  process.stderr.write(`  Updated: ${result.updated}`);
  process.stderr.write(`  Skipped: ${result.skipped}`);
  if (result.errors > 0) {
    process.stderr.write(`  Errors: ${result.errors}`);
  }
  process.stderr.write(`  (Total: ${total})\n\n`);

  if (dryRun) {
    process.stderr.write("  * Dry run — no changes were made.\n");
    process.stderr.write("  Remove --dry-run to execute the import.\n\n");
  }
}
