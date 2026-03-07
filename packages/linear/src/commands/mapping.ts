/**
 * Mapping command for locus-linear.
 *
 * Displays current state mapping, label mapping, and priority mapping
 * in a formatted table view.
 */

import { loadLinearConfig } from "../config.js";
import { mapPriority } from "../sync/mapper.js";

export function mappingCommand(_args: string[]): void {
  const config = loadLinearConfig();

  process.stderr.write("\n  Linear Field Mappings\n");
  process.stderr.write(`  ${"═".repeat(60)}\n\n`);

  // Priority mapping (static)
  process.stderr.write("  Priority Mapping (Linear → GitHub)\n");
  process.stderr.write(`  ${"─".repeat(40)}\n`);
  for (let i = 1; i <= 4; i++) {
    const label = mapPriority(i);
    const name =
      i === 1 ? "Urgent" : i === 2 ? "High" : i === 3 ? "Medium" : "Low";
    process.stderr.write(`  ${String(i).padEnd(6)} ${name.padEnd(12)} → ${label}\n`);
  }
  process.stderr.write("\n");

  // State mapping (from config)
  process.stderr.write("  State Mapping (Linear → GitHub)\n");
  process.stderr.write(`  ${"─".repeat(40)}\n`);
  const stateEntries = Object.entries(config.stateMapping);
  if (stateEntries.length === 0) {
    process.stderr.write("  No state mappings configured.\n");
    process.stderr.write(
      "  Run: locus pkg linear auth  (auto-detects from Linear)\n"
    );
  } else {
    for (const [linearState, githubLabel] of stateEntries) {
      process.stderr.write(
        `  ${linearState.padEnd(20)} → ${githubLabel}\n`
      );
    }
  }
  process.stderr.write("\n");

  // Label mapping (from config)
  process.stderr.write("  Label Mapping (Linear → GitHub)\n");
  process.stderr.write(`  ${"─".repeat(40)}\n`);
  const labelEntries = Object.entries(config.labelMapping);
  if (labelEntries.length === 0) {
    process.stderr.write("  No label mappings configured.\n");
    process.stderr.write(
      "  Run: locus pkg linear auth  (auto-detects from Linear)\n"
    );
  } else {
    for (const [linearLabel, githubLabel] of labelEntries) {
      process.stderr.write(
        `  ${linearLabel.padEnd(20)} → ${githubLabel}\n`
      );
    }
  }
  process.stderr.write("\n");

  // User mapping (from config)
  const userEntries = Object.entries(config.userMapping);
  if (userEntries.length > 0) {
    process.stderr.write("  User Mapping (Linear → GitHub)\n");
    process.stderr.write(`  ${"─".repeat(40)}\n`);
    for (const [linearUser, githubUser] of userEntries) {
      process.stderr.write(
        `  ${linearUser.padEnd(20)} → ${githubUser}\n`
      );
    }
    process.stderr.write("\n");
  }
}
