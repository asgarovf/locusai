/**
 * `locus upgrade` — Self-upgrade & version management.
 *
 * Usage:
 *   locus upgrade              # Check for updates and upgrade
 *   locus upgrade --check      # Check only (don't install)
 *   locus upgrade --version X  # Upgrade to a specific version
 */

import { execSync } from "node:child_process";
import { getLogger } from "../core/logger.js";
import { Spinner } from "../display/progress.js";
import { bold, cyan, dim, drawBox, green } from "../display/terminal.js";

const PACKAGE_NAME = "@locusai/tui";

/** Compare two semver strings. Returns -1, 0, or 1. */
export function compareSemver(a: string, b: string): number {
  const partsA = a.replace(/^v/, "").split(".").map(Number);
  const partsB = b.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

/** Fetch the latest version from the npm registry. */
export function fetchLatestVersion(): string | null {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15_000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

/** Install a specific version of the package globally. */
function installVersion(version: string): boolean {
  try {
    // Clean npm cache first
    execSync("npm cache clean --force", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
  } catch {
    // Non-fatal — cache clean is best-effort
  }

  try {
    execSync(`npm install -g ${PACKAGE_NAME}@${version}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Verify the installed version matches what we expected. */
function verifyInstalled(expectedVersion: string): boolean {
  try {
    const installed = execSync(`npm list -g ${PACKAGE_NAME} --depth=0 --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10_000,
    });
    const parsed = JSON.parse(installed);
    const packageKey = PACKAGE_NAME.split("/").at(-1);
    const version =
      parsed?.dependencies?.[PACKAGE_NAME]?.version ??
      (packageKey ? parsed?.dependencies?.[packageKey]?.version : undefined) ??
      parsed?.dependencies?.cli2?.version;
    return version === expectedVersion;
  } catch {
    return false;
  }
}

export async function upgradeCommand(
  _projectRoot: string,
  _args: string[],
  flags: { check?: boolean; targetVersion?: string; currentVersion: string }
): Promise<void> {
  const log = getLogger();
  const spinner = new Spinner();

  const currentVersion = flags.currentVersion;

  // Step 1: Check for latest version
  spinner.start("Checking for updates...");

  let targetVersion: string;

  if (flags.targetVersion) {
    // User specified a target version
    targetVersion = flags.targetVersion.replace(/^v/, "");
    spinner.succeed(`Target version: ${targetVersion}`);
  } else {
    // Fetch latest from npm
    const latest = fetchLatestVersion();
    if (!latest) {
      spinner.fail("Cannot check for updates. Verify network connection.");
      return;
    }
    targetVersion = latest;
    spinner.succeed(`Latest version: ${targetVersion}`);
  }

  // Step 2: Compare versions
  const cmp = compareSemver(currentVersion, targetVersion);

  if (cmp === 0) {
    process.stderr.write(
      `\n${green("✓")} Already up to date ${dim(`(v${currentVersion})`)}\n\n`
    );
    return;
  }

  if (cmp > 0 && !flags.targetVersion) {
    process.stderr.write(
      `\n${green("✓")} Current version (${currentVersion}) is ahead of latest (${targetVersion})\n\n`
    );
    return;
  }

  // Step 3: Show update info
  const direction = cmp < 0 ? "Update" : "Downgrade";
  const lines = [
    `  ${direction} available: ${bold(currentVersion)} ${dim("→")} ${bold(cyan(targetVersion))}`,
    "",
    `  Run: ${dim(`npm install -g ${PACKAGE_NAME}@${targetVersion}`)}`,
  ];

  process.stderr.write(
    `\n${drawBox(lines, { title: `Locus ${direction}` })}\n\n`
  );

  // Check-only mode stops here
  if (flags.check) {
    return;
  }

  // Step 4: Install
  spinner.start(`Installing ${PACKAGE_NAME}@${targetVersion}...`);
  log.info(`Upgrading from ${currentVersion} to ${targetVersion}`);

  const success = installVersion(targetVersion);

  if (!success) {
    spinner.fail("Installation failed.");
    process.stderr.write(
      `\n  Try manually: ${bold(`npm install -g ${PACKAGE_NAME}@${targetVersion}`)}\n\n`
    );
    return;
  }

  // Step 5: Verify
  const verified = verifyInstalled(targetVersion);

  if (verified) {
    spinner.succeed(`Upgraded to v${targetVersion}`);
    log.info(`Successfully upgraded to ${targetVersion}`);
  } else {
    spinner.warn(
      `Installation completed but version verification failed. Restart your shell and run ${bold("locus --version")} to verify.`
    );
  }

  process.stderr.write("\n");
}
