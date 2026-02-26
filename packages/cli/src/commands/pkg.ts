/**
 * `locus pkg <name> [command] [args...]` — Dispatch to an installed package binary.
 *
 * Usage:
 *   locus pkg telegram start     # spawn locus-telegram with ["start"]
 *   locus pkg telegram           # spawn locus-telegram with no args (shows package help)
 *   locus pkg                    # list all installed packages
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { bold, cyan, dim, green, red, yellow } from "../display/terminal.js";
import {
  loadRegistry,
  normalizePackageName,
} from "../packages/registry.js";

// ─── List installed packages ──────────────────────────────────────────────────

function listInstalledPackages(): void {
  const registry = loadRegistry();
  const entries = Object.values(registry.packages);

  if (entries.length === 0) {
    process.stderr.write(`${yellow("⚠")}  No packages installed.\n`);
    process.stderr.write(
      `  Install one with: ${bold("locus install <package>")}\n`
    );
    return;
  }

  process.stderr.write(`\n${bold("Installed packages:")}\n\n`);

  for (const entry of entries) {
    const { name, version, manifest } = entry;
    const displayName = manifest.displayName || name;

    process.stderr.write(
      `  ${bold(cyan(displayName))} ${dim(`v${version}`)}\n`
    );

    if (manifest.description) {
      process.stderr.write(`  ${dim(manifest.description)}\n`);
    }

    if (manifest.commands.length > 0) {
      process.stderr.write(
        `  Commands: ${manifest.commands.map((c) => green(c)).join(", ")}\n`
      );
    }

    process.stderr.write(
      `  Run: ${bold(`locus pkg ${name.replace(/^locus-/, "")} --help`)}\n`
    );
    process.stderr.write("\n");
  }
}

// ─── Spawn package binary ─────────────────────────────────────────────────────

function spawnPackageBinary(
  binaryPath: string,
  args: string[]
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(binaryPath, args, {
      stdio: "inherit",
      env: { ...process.env, LOCUS_PKG: "1" },
    });

    // Forward SIGINT to child so Ctrl+C is handled by the package process.
    // The parent ignores SIGINT while the child is alive; the child's exit
    // code is forwarded via the 'close' event below.
    const onSigint = () => {
      child.kill("SIGINT");
    };
    process.on("SIGINT", onSigint);

    child.on("error", (err) => {
      process.removeListener("SIGINT", onSigint);
      process.stderr.write(`${red("✗")} Failed to spawn binary: ${err.message}\n`);
      resolve(1);
    });

    child.on("close", (code, signal) => {
      process.removeListener("SIGINT", onSigint);
      if (signal) {
        // Child was killed by a signal — exit with 128 + signal number
        // (standard convention), or 130 for SIGINT.
        resolve(signal === "SIGINT" ? 130 : 1);
      } else {
        resolve(code ?? 0);
      }
    });
  });
}

// ─── Command ──────────────────────────────────────────────────────────────────

/**
 * Dispatch to an installed Locus package binary.
 *
 * @param args  Positional arguments after `pkg` (first is the package short name).
 * @param _flags Key-value string flags (unused for now, reserved for future use).
 */
export async function pkgCommand(
  args: string[],
  _flags: Record<string, string>
): Promise<void> {
  const packageInput = args[0];

  // No package name provided — list installed packages
  if (!packageInput) {
    listInstalledPackages();
    return;
  }

  const packageName = normalizePackageName(packageInput);
  const registry = loadRegistry();
  const entry = registry.packages[packageName];

  // Package not found in registry
  if (!entry) {
    process.stderr.write(
      `${red("✗")} Package ${bold(`'${packageInput}'`)} is not installed.\n`
    );
    process.stderr.write(
      `  Run: ${bold(`locus install ${packageInput}`)}\n`
    );
    process.exit(1);
    return;
  }

  // Guard against the binary having been manually deleted after install
  const binaryPath = entry.binaryPath;

  if (!binaryPath || !existsSync(binaryPath)) {
    process.stderr.write(
      `${red("✗")} Binary for ${bold(packageName)} not found on disk.\n`
    );
    if (binaryPath) {
      process.stderr.write(`  Expected: ${dim(binaryPath)}\n`);
    }
    process.stderr.write(
      `  Try reinstalling: ${bold(`locus install ${packageInput} --upgrade`)}\n`
    );
    process.exit(1);
    return;
  }

  // Forward all remaining args to the binary (args[1..])
  const remainingArgs = args.slice(1);

  const exitCode = await spawnPackageBinary(binaryPath, remainingArgs);
  process.exit(exitCode);
}
