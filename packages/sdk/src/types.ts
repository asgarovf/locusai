// ─── Locus Package Manifest ───────────────────────────────────────────────────

/**
 * Shape of the `"locus"` metadata field inside a community package's
 * `package.json`. Packages must include this field to be fully recognised and
 * listed by the Locus CLI.
 *
 * @example
 * ```json
 * {
 *   "name": "locus-telegram",
 *   "locus": {
 *     "displayName": "Telegram",
 *     "description": "Remote-control Locus via Telegram",
 *     "commands": ["telegram"],
 *     "version": "1.0.0"
 *   }
 * }
 * ```
 */
export interface LocusPackageManifest {
  /** Human-readable name shown in `locus packages list` and the marketplace. */
  displayName: string;
  /** One-line description of what the package does. */
  description: string;
  /** Sub-commands contributed by this package, e.g. `["telegram"]`. */
  commands: string[];
  /** Semver version string — should mirror the npm package version. */
  version: string;
}

// ─── Locus Config ────────────────────────────────────────────────────────────

/** Supported AI provider identifiers. */
export type AIProvider = "claude" | "codex";

/** Shape of the project-level `.locus/config.json`. */
export interface LocusConfig {
  /** Config schema version, e.g. `"0.19.1"`. */
  version: string;
  /** GitHub repository settings. */
  github: {
    /** Repository owner (user or org). */
    owner: string;
    /** Repository name. */
    repo: string;
    /** Default branch, usually `"main"`. */
    defaultBranch: string;
  };
  /** AI provider and model settings. */
  ai: {
    /** Active provider. */
    provider: AIProvider;
    /** Model ID, e.g. `"claude-sonnet-4-6"`. */
    model: string;
  };
  /** Agent execution settings. */
  agent: {
    /** Maximum number of parallel agent tasks. */
    maxParallel: number;
    /** Whether to auto-apply labels on issues. */
    autoLabel: boolean;
    /** Whether to auto-create PRs after task completion. */
    autoPR: boolean;
    /** Base branch for agent branches. */
    baseBranch: string;
    /** Whether to rebase from base branch before each task. */
    rebaseBeforeTask: boolean;
  };
  /** Sprint settings. */
  sprint: {
    /** Active sprint label, or `null` if none. */
    active: string | null;
    /** Whether to stop the sprint on the first failure. */
    stopOnFailure: boolean;
  };
  /** Logging settings. */
  logging: {
    /** Log verbosity level. */
    level: "silent" | "normal" | "verbose" | "debug";
    /** Maximum number of log files to keep. */
    maxFiles: number;
    /** Maximum total log size in MB before pruning. */
    maxTotalSizeMB: number;
  };
}
