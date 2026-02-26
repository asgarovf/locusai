// ─── Locus Package System Types ──────────────────────────────────────────────

/**
 * Shape of the `"locus"` metadata field inside a package's `package.json`.
 * Published packages must include this field to be recognised by the Locus CLI.
 */
export interface LocusPackageManifest {
  /** Human-readable name shown in the marketplace / help output. */
  displayName: string;
  /** Short description of what the package does. */
  description: string;
  /** Sub-commands contributed by this package (e.g. ["telegram"]). */
  commands: string[];
  /** Semver version string — mirrors the npm package version. */
  version: string;
}

/**
 * A single installed-package record persisted in the global registry.
 */
export interface LocusPackageRegistryEntry {
  /** Full npm package name, e.g. "locus-telegram". */
  name: string;
  /** Installed semver version, e.g. "1.2.3". */
  version: string;
  /** ISO-8601 timestamp of when the package was installed. */
  installedAt: string;
  /** Absolute path to the package's primary binary. */
  binaryPath: string;
  /** Parsed locus metadata from the package's package.json. */
  manifest: LocusPackageManifest;
}

/**
 * Full shape of `~/.locus/packages/registry.json`.
 * Keys are full npm package names (e.g. "locus-telegram").
 */
export interface LocusPackageRegistry {
  packages: Record<string, LocusPackageRegistryEntry>;
}
