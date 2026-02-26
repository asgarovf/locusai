/**
 * `locus packages [subcommand]` — Manage installed Locus packages.
 *
 * Subcommands:
 *   locus packages              # alias for `locus packages list`
 *   locus packages list         # list all installed packages
 *   locus packages outdated     # show packages with available upgrades
 */

import { spawnSync } from "node:child_process";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import { loadRegistry } from "../packages/registry.js";
import { listInstalledPackages } from "./pkg.js";

// ─── Outdated ─────────────────────────────────────────────────────────────────

function checkOutdated(): void {
  const registry = loadRegistry();
  const entries = Object.values(registry.packages);

  if (entries.length === 0) {
    process.stderr.write(`${yellow("⚠")}  No packages installed.\n`);
    process.stderr.write(
      `  Install one with: ${bold("locus install <package>")}\n`
    );
    return;
  }

  process.stderr.write(`\nChecking for updates...\n\n`);

  type OutdatedEntry = {
    name: string;
    installed: string;
    latest: string;
  };

  const outdated: OutdatedEntry[] = [];
  const upToDate: string[] = [];

  for (const entry of entries) {
    const result = spawnSync("npm", ["view", entry.name, "version"], {
      encoding: "utf-8",
      shell: false,
    });

    if (result.error || result.status !== 0) {
      process.stderr.write(
        `${yellow("⚠")}  Could not check ${bold(entry.name)}: ${result.error?.message ?? "npm view failed"}\n`
      );
      continue;
    }

    const latest = (result.stdout ?? "").trim();

    if (!latest) {
      process.stderr.write(
        `${yellow("⚠")}  Could not determine latest version for ${bold(entry.name)}\n`
      );
      continue;
    }

    if (latest !== entry.version) {
      outdated.push({ name: entry.name, installed: entry.version, latest });
    } else {
      upToDate.push(entry.name);
    }
  }

  if (outdated.length === 0) {
    process.stderr.write(`${green("✓")} All packages are up to date.\n\n`);
    return;
  }

  process.stderr.write(`${bold("Outdated packages:")}\n\n`);

  // Column widths
  const nameWidth = Math.max(
    "Package".length,
    ...outdated.map((e) => e.name.length)
  );
  const installedWidth = Math.max(
    "Installed".length,
    ...outdated.map((e) => e.installed.length)
  );
  const latestWidth = Math.max(
    "Latest".length,
    ...outdated.map((e) => e.latest.length)
  );

  const pad = (s: string, w: number) => s.padEnd(w);

  process.stderr.write(
    `  ${bold(pad("Package", nameWidth))}  ${dim(pad("Installed", installedWidth))}  ${green(pad("Latest", latestWidth))}\n`
  );
  process.stderr.write(
    `  ${"-".repeat(nameWidth)}  ${"-".repeat(installedWidth)}  ${"-".repeat(latestWidth)}\n`
  );

  for (const entry of outdated) {
    process.stderr.write(
      `  ${cyan(pad(entry.name, nameWidth))}  ${dim(pad(entry.installed, installedWidth))}  ${green(pad(entry.latest, latestWidth))}\n`
    );
  }

  process.stderr.write("\n");
  process.stderr.write(
    `  Run ${bold("locus install <package> --upgrade")} to upgrade a package.\n\n`
  );

  if (upToDate.length > 0) {
    process.stderr.write(
      `  ${dim(`${upToDate.length} package(s) already up to date.`)}\n\n`
    );
  }
}

// ─── Command ──────────────────────────────────────────────────────────────────

/**
 * Manage installed Locus packages.
 *
 * @param args  Positional arguments after `packages` (first is the subcommand).
 * @param _flags Key-value string flags (reserved for future use).
 */
export async function packagesCommand(
  args: string[],
  _flags: Record<string, string>
): Promise<void> {
  const subcommand = args[0] ?? "list";

  switch (subcommand) {
    case "list":
      listInstalledPackages();
      break;

    case "outdated":
      checkOutdated();
      break;

    default:
      process.stderr.write(
        `${red("✗")} Unknown subcommand: ${bold(subcommand)}\n`
      );
      process.stderr.write(
        `  Available: ${bold("list")}, ${bold("outdated")}\n`
      );
      process.exit(1);
  }
}
