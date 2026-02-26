/**
 * `locus uninstall <package>` — Remove an installed community package.
 *
 * Usage:
 *   locus uninstall telegram        # removes locus-telegram
 *   locus uninstall locus-telegram  # full name also accepted
 */

import { spawnSync } from "node:child_process";
import { bold, cyan, dim, green, red } from "../display/terminal.js";
import {
  getPackagesDir,
  loadRegistry,
  normalizePackageName,
  saveRegistry,
} from "../packages/registry.js";

// ─── Command ──────────────────────────────────────────────────────────────────

/**
 * Uninstall an installed Locus community package.
 *
 * @param args  Positional arguments after `uninstall` (first is the package name).
 * @param _flags Key-value string flags (reserved for future use).
 */
export async function uninstallCommand(
  args: string[],
  _flags: Record<string, string>
): Promise<void> {
  const rawArg = args[0];

  if (!rawArg) {
    process.stderr.write(
      `${red("✗")} Usage: locus uninstall <package>\n`
    );
    process.exit(1);
    return;
  }

  const packageName = normalizePackageName(rawArg);

  // ── Check registry ─────────────────────────────────────────────────────────
  const registry = loadRegistry();
  const existing = registry.packages[packageName];

  if (!existing) {
    process.stderr.write(
      `${red("✗")} Package ${bold(`'${rawArg}'`)} is not installed.\n`
    );
    process.stderr.write(
      `  Run ${bold("locus packages list")} to see installed packages.\n`
    );
    process.exit(1);
    return;
  }

  const { version } = existing;

  // ── Run npm uninstall ──────────────────────────────────────────────────────
  const packagesDir = getPackagesDir();

  process.stderr.write(`\n  Uninstalling ${bold(cyan(packageName))} ${dim(`v${version}`)}...\n\n`);

  const result = spawnSync("npm", ["uninstall", packageName], {
    cwd: packagesDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    process.stderr.write(
      `\n${red("✗")} Could not run npm: ${result.error.message}\n`
    );
    process.stderr.write(
      `  Make sure npm is installed and available in your PATH.\n`
    );
    process.exit(1);
    return;
  }

  if (result.status !== 0) {
    process.stderr.write(
      `\n${red("✗")} npm uninstall failed for ${bold(packageName)}.\n`
    );
    process.exit(1);
    return;
  }

  // ── Remove from registry ───────────────────────────────────────────────────
  delete registry.packages[packageName];
  saveRegistry(registry);

  // ── Success output ─────────────────────────────────────────────────────────
  process.stderr.write(
    `${green("✓")} Uninstalled ${bold(cyan(packageName))} ${dim(`v${version}`)}\n`
  );
}
