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
  const home = process.env.HOME || homedir();
  const dir = join(home, ".locus", "packages");

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
 * For scoped packages (e.g. `@locusai/locus-telegram`), npm creates the
 * `.bin/` symlink using just the name part after the scope (`locus-telegram`).
 *
 * Returns `null` if the binary does not exist on disk.
 */
export function resolvePackageBinary(packageName: string): string | null {
  const fullName = normalizePackageName(packageName);

  // For scoped packages, the .bin entry uses the name after the scope.
  const binName = fullName.includes("/")
    ? (fullName.split("/").pop() as string)
    : fullName;

  const binPath = join(getPackagesDir(), "node_modules", ".bin", binName);
  return existsSync(binPath) ? binPath : null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** The npm scope all official Locus packages live under. */
export const PACKAGE_SCOPE = "@locusai";

/** Full prefix for scoped Locus packages. */
const SCOPED_PREFIX = `${PACKAGE_SCOPE}/locus-`;

// ─── Name Normalisation ──────────────────────────────────────────────────────

/**
 * Converts a short package name to its full scoped npm name.
 *
 * - `"telegram"`                → `"@locusai/locus-telegram"`
 * - `"@locusai/locus-telegram"` → `"@locusai/locus-telegram"` (unchanged)
 */
export function normalizePackageName(input: string): string {
  // Already a scoped @locusai package → pass through.
  if (input.startsWith(SCOPED_PREFIX)) {
    return input;
  }
  // Short name → add scope and prefix.
  return `${SCOPED_PREFIX}${input}`;
}

/**
 * Extracts the user-facing short name from a full package name.
 *
 * - `"@locusai/locus-telegram"` → `"telegram"`
 */
export function extractShortName(packageName: string): string {
  if (packageName.startsWith(SCOPED_PREFIX)) {
    return packageName.slice(SCOPED_PREFIX.length);
  }
  return packageName;
}
