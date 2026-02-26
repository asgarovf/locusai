/**
 * Global package registry helpers.
 *
 * All installed Locus packages live under `~/.locus/packages/`.  A
 * `registry.json` file in that directory tracks metadata for every package
 * that has been installed via `locus install`.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { LocusPackageRegistry } from "./types.js";

// ─── Paths ───────────────────────────────────────────────────────────────────

/**
 * Returns the path to the global packages directory (`~/.locus/packages/`).
 * Creates the directory and seeds a `package.json` if neither exists yet.
 */
export function getPackagesDir(): string {
  const dir = join(homedir(), ".locus", "packages");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const pkgJson = join(dir, "package.json");
  if (!existsSync(pkgJson)) {
    writeFileSync(
      pkgJson,
      `${JSON.stringify({ private: true }, null, 2)}\n`,
      "utf-8"
    );
  }

  return dir;
}

/**
 * Returns the path to `~/.locus/packages/registry.json`.
 */
export function getRegistryPath(): string {
  return join(getPackagesDir(), "registry.json");
}

// ─── Registry I/O ────────────────────────────────────────────────────────────

/**
 * Reads and parses `registry.json`.
 * Returns an empty registry if the file does not exist or is malformed.
 */
export function loadRegistry(): LocusPackageRegistry {
  const registryPath = getRegistryPath();

  if (!existsSync(registryPath)) {
    return { packages: {} };
  }

  try {
    const raw = readFileSync(registryPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "packages" in parsed &&
      typeof (parsed as Record<string, unknown>).packages === "object"
    ) {
      return parsed as LocusPackageRegistry;
    }
    return { packages: {} };
  } catch {
    return { packages: {} };
  }
}

/**
 * Writes the registry to disk atomically (write to a tmp file, then rename).
 */
export function saveRegistry(registry: LocusPackageRegistry): void {
  const registryPath = getRegistryPath();
  const tmp = `${registryPath}.tmp`;

  writeFileSync(tmp, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");
  // renameSync is atomic on POSIX; on Windows it overwrites the destination.
  renameSync(tmp, registryPath);
}

// ─── Binary Resolution ───────────────────────────────────────────────────────

/**
 * Given a short name like `"telegram"`, resolves the absolute path to the
 * binary inside `~/.locus/packages/node_modules/.bin/locus-telegram`.
 *
 * Returns `null` if the binary does not exist on disk.
 */
export function resolvePackageBinary(packageName: string): string | null {
  const fullName = normalizePackageName(packageName);
  const binPath = join(getPackagesDir(), "node_modules", ".bin", fullName);
  return existsSync(binPath) ? binPath : null;
}

// ─── Name Normalisation ──────────────────────────────────────────────────────

/**
 * Converts a short package name to its full npm name.
 *
 * - `"telegram"` → `"locus-telegram"`
 * - `"locus-telegram"` → `"locus-telegram"` (unchanged)
 * - `"@org/locus-telegram"` → `"@org/locus-telegram"` (scoped, unchanged)
 */
export function normalizePackageName(input: string): string {
  // Scoped packages (@org/…) are passed through as-is.
  if (input.startsWith("@")) {
    return input;
  }
  // Already prefixed → pass through.
  if (input.startsWith("locus-")) {
    return input;
  }
  return `locus-${input}`;
}
