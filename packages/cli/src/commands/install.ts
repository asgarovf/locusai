/**
 * `locus install <package>` — Install a community package from npm.
 *
 * Usage:
 *   locus install telegram               # installs locus-telegram@latest
 *   locus install telegram -v 1.0.0      # pins a specific version
 *   locus install telegram --version 1.0.0
 *   locus install telegram@1.0.0         # inline @version syntax
 *   locus install telegram --upgrade     # upgrade an already-installed package
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import {
  getPackagesDir,
  loadRegistry,
  normalizePackageName,
  resolvePackageBinary,
  saveRegistry,
} from "../packages/registry.js";
import type {
  LocusPackageManifest,
  LocusPackageRegistryEntry,
} from "../packages/types.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a raw package argument that may embed a version after `@`.
 *
 * Examples:
 *   "telegram"             → { name: "telegram",          version: undefined }
 *   "telegram@1.0.0"       → { name: "telegram",          version: "1.0.0"   }
 *   "locus-telegram@1.0.0" → { name: "locus-telegram",    version: "1.0.0"   }
 *   "@org/pkg@2.0.0"       → { name: "@org/pkg",          version: "2.0.0"   }
 */
function parsePackageArg(raw: string): {
  name: string;
  version: string | undefined;
} {
  if (raw.startsWith("@")) {
    // Scoped: @scope/name[@version]
    const slashIdx = raw.indexOf("/");
    if (slashIdx !== -1) {
      const afterSlash = raw.slice(slashIdx + 1);
      const atIdx = afterSlash.indexOf("@");
      if (atIdx !== -1) {
        return {
          name: raw.slice(0, slashIdx + 1 + atIdx),
          version: afterSlash.slice(atIdx + 1) || undefined,
        };
      }
    }
    return { name: raw, version: undefined };
  }

  // Unscoped: name[@version]
  const atIdx = raw.indexOf("@");
  if (atIdx !== -1) {
    return {
      name: raw.slice(0, atIdx),
      version: raw.slice(atIdx + 1) || undefined,
    };
  }
  return { name: raw, version: undefined };
}

// ─── Command ──────────────────────────────────────────────────────────────────

/**
 * Install (or upgrade) a Locus community package from npm.
 *
 * @param args  Positional arguments after `install` (first is the package name).
 * @param flags Key-value string flags: `version`, `upgrade`.
 */
export async function installCommand(
  args: string[],
  flags: Record<string, string>
): Promise<void> {
  const rawArg = args[0];

  if (!rawArg) {
    process.stderr.write(
      `${red("✗")} Usage: locus install <package> [--version <ver>] [--upgrade]\n`
    );
    process.exit(1);
    return;
  }

  // ── Parse package name and optional inline version ─────────────────────────
  const { name: packageInput, version: inlineVersion } =
    parsePackageArg(rawArg);

  // Flag version takes precedence over inline version
  const pinnedVersion: string | undefined = flags.version ?? inlineVersion;
  const isUpgrade = flags.upgrade === "true";

  const packageName = normalizePackageName(packageInput);
  const versionSuffix = pinnedVersion ? `@${pinnedVersion}` : "@latest";
  const packageSpec = `${packageName}${versionSuffix}`;

  // ── Already installed? ─────────────────────────────────────────────────────
  const registry = loadRegistry();
  const existing = registry.packages[packageName];

  if (existing && !isUpgrade) {
    process.stderr.write(
      `${green("✓")} ${bold(packageName)} is already installed ${dim(`(v${existing.version})`)}\n`
    );
    process.stderr.write(
      `  To upgrade, run: ${bold(`locus install ${packageInput} --upgrade`)}\n`
    );
    return;
  }

  // ── Run npm install ────────────────────────────────────────────────────────
  const packagesDir = getPackagesDir();

  const action = existing ? "Upgrading" : "Installing";
  process.stderr.write(`\n  ${action} ${bold(packageSpec)}...\n\n`);

  const result = spawnSync("npm", ["install", packageSpec], {
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
      `\n${red("✗")} Failed to install ${bold(packageSpec)}.\n`
    );
    process.stderr.write(
      `  Make sure the package exists on npm and you have network access.\n`
    );
    process.exit(1);
    return;
  }

  // ── Read installed package.json ────────────────────────────────────────────
  const installedPkgJsonPath = join(
    packagesDir,
    "node_modules",
    packageName,
    "package.json"
  );

  if (!existsSync(installedPkgJsonPath)) {
    process.stderr.write(
      `\n${red("✗")} Package installed but package.json not found at:\n`
    );
    process.stderr.write(`  ${dim(installedPkgJsonPath)}\n`);
    process.exit(1);
    return;
  }

  let installedPkgJson: { version?: string; locus?: LocusPackageManifest };
  try {
    installedPkgJson = JSON.parse(
      readFileSync(installedPkgJsonPath, "utf-8")
    ) as { version?: string; locus?: LocusPackageManifest };
  } catch {
    process.stderr.write(
      `\n${red("✗")} Could not parse installed package.json.\n`
    );
    process.exit(1);
    return;
  }

  const installedVersion = installedPkgJson.version ?? "unknown";
  const locusManifest = installedPkgJson.locus;

  // ── Warn if missing locus manifest ────────────────────────────────────────
  if (!locusManifest) {
    process.stderr.write(
      `\n${yellow("⚠")}  ${bold(packageName)} does not have a "locus" field in package.json.\n`
    );
    process.stderr.write(`  It may not integrate fully with the Locus CLI.\n`);
  }

  // ── Resolve binary ─────────────────────────────────────────────────────────
  const binaryPath = resolvePackageBinary(packageName) ?? "";

  if (!binaryPath) {
    process.stderr.write(
      `\n${yellow("⚠")}  No binary found for ${bold(packageName)} in node_modules/.bin/.\n`
    );
  }

  // ── Build a fallback manifest when locus field is absent ──────────────────
  const manifest: LocusPackageManifest = locusManifest ?? {
    displayName: packageName,
    description: "",
    commands: [],
    version: installedVersion,
  };

  // ── Persist registry entry ─────────────────────────────────────────────────
  const entry: LocusPackageRegistryEntry = {
    name: packageName,
    version: installedVersion,
    installedAt: new Date().toISOString(),
    binaryPath,
    manifest,
  };

  registry.packages[packageName] = entry;
  saveRegistry(registry);

  // ── Success output ─────────────────────────────────────────────────────────
  const verb = existing ? "upgraded" : "installed";
  process.stderr.write(`\n${green("✓")} Package ${verb} successfully!\n\n`);

  process.stderr.write(`  Package: ${bold(cyan(packageName))}\n`);
  process.stderr.write(`  Version: ${bold(installedVersion)}\n`);

  if (manifest.commands.length > 0) {
    process.stderr.write(
      `  Commands: ${manifest.commands.map((c) => bold(c)).join(", ")}\n`
    );
  }

  if (binaryPath) {
    process.stderr.write(`  Binary:  ${dim(binaryPath)}\n`);
  }

  process.stderr.write("\n");
}
