/**
 * Export command for locus-linear.
 *
 * Reads GitHub Issue states and pushes status updates back to Linear.
 *
 * Usage:
 *   locus pkg linear export              → export all changed statuses
 *   locus pkg linear export --dry-run    → preview without updating Linear
 */

import { loadLinearConfig, validateLinearConfig } from "../config.js";
import { handleCommandError } from "../errors.js";
import {
  type ExportOptions,
  type ExportResult,
  runExport,
} from "../sync/exporter.js";

export async function exportCommand(args: string[]): Promise<void> {
  const options = parseExportArgs(args);

  const config = loadLinearConfig();
  const configError = validateLinearConfig(config);
  if (configError) {
    process.stderr.write(`\n  ${configError}\n\n`);
    process.exit(1);
  }

  if (options.dryRun) {
    process.stderr.write("\n  Dry run — no Linear issues will be updated.\n\n");
  }

  process.stderr.write("  Reading GitHub issue states...\n");

  let result: ExportResult;
  try {
    result = await runExport(options);
  } catch (err) {
    handleCommandError(err);
  }

  printResults(result, options.dryRun ?? false);
}

function parseExportArgs(args: string[]): ExportOptions {
  const options: ExportOptions = {};

  for (const arg of args) {
    switch (arg) {
      case "--dry-run":
        options.dryRun = true;
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

function printResults(result: ExportResult, dryRun: boolean): void {
  const prefix = dryRun ? "Would have" : "";
  const total = result.updated + result.unchanged + result.errors;

  process.stderr.write("\n  Export Summary\n");
  process.stderr.write(`  ${"─".repeat(50)}\n`);

  if (result.issues.length > 0) {
    process.stderr.write(
      `\n  ${"Action".padEnd(12)} ${"Linear".padEnd(12)} ${"GitHub".padEnd(8)} Details\n`
    );
    process.stderr.write(
      `  ${"─".repeat(12)} ${"─".repeat(12)} ${"─".repeat(8)} ${"─".repeat(30)}\n`
    );

    for (const issue of result.issues) {
      const action =
        issue.action === "error"
          ? "ERROR"
          : dryRun
            ? `${issue.action}*`
            : issue.action;
      const details = issue.details ?? issue.error ?? "";

      process.stderr.write(
        `  ${action.padEnd(12)} ${issue.linearIdentifier.padEnd(12)} #${String(issue.githubNumber).padEnd(7)} ${details}\n`
      );
    }
  }

  process.stderr.write(`\n  ${prefix} Updated: ${result.updated}`);
  process.stderr.write(`  Unchanged: ${result.unchanged}`);
  if (result.errors > 0) {
    process.stderr.write(`  Errors: ${result.errors}`);
  }
  process.stderr.write(`  (Total: ${total})\n\n`);

  if (dryRun) {
    process.stderr.write("  * Dry run — no changes were made.\n");
    process.stderr.write("  Remove --dry-run to execute the export.\n\n");
  }
}
