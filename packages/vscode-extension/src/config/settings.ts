import * as vscode from "vscode";

// ============================================================================
// Types
// ============================================================================

export interface ExecutionPreferences {
  /** Require confirmation before running exec tasks. Default: true. */
  confirmBeforeRun: boolean;
}

export interface LocusSettings {
  /** Base URL for the Locus API. */
  apiUrl: string;
  /** Path to the Locus CLI binary. Empty string falls back to PATH lookup. */
  cliBinaryPath: string;
  /** Default model for new sessions. Empty string uses CLI default. */
  defaultModel: string;
  /** Execution behavior preferences. */
  execution: ExecutionPreferences;
}

export interface SettingsValidationError {
  setting: string;
  message: string;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULTS: LocusSettings = {
  apiUrl: "https://api.locusai.dev",
  cliBinaryPath: "",
  defaultModel: "",
  execution: {
    confirmBeforeRun: true,
  },
};

// ============================================================================
// Settings Reader
// ============================================================================

/**
 * Read and return the current Locus extension settings from workspace
 * configuration. Missing or invalid values fall back to safe defaults.
 */
export function getSettings(): LocusSettings {
  const cfg = vscode.workspace.getConfiguration("locusai");

  return {
    apiUrl: cfg.get<string>("apiUrl") || DEFAULTS.apiUrl,
    cliBinaryPath: cfg.get<string>("cliBinaryPath") || DEFAULTS.cliBinaryPath,
    defaultModel: cfg.get<string>("defaultModel") || DEFAULTS.defaultModel,
    execution: {
      confirmBeforeRun:
        cfg.get<boolean>("execution.confirmBeforeRun") ??
        DEFAULTS.execution.confirmBeforeRun,
    },
  };
}

/**
 * Resolve the CLI binary path from settings or fall back to "locus" (PATH).
 */
export function getCliBinaryPath(): string {
  const settings = getSettings();
  return settings.cliBinaryPath || "locus";
}

/**
 * Validate current settings and return any issues found.
 * Returns an empty array if all settings are valid.
 */
export function validateSettings(): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];
  const cfg = vscode.workspace.getConfiguration("locusai");

  const apiUrl = cfg.get<string>("apiUrl");
  if (apiUrl !== undefined && apiUrl !== "") {
    try {
      new URL(apiUrl);
    } catch {
      errors.push({
        setting: "locusai.apiUrl",
        message: `Invalid API URL: "${apiUrl}". Must be a valid URL (e.g., https://api.locusai.dev).`,
      });
    }
  }

  return errors;
}

/**
 * Check settings validity and show an actionable warning if issues exist.
 * Returns true if settings are valid, false otherwise.
 */
export async function ensureValidSettings(): Promise<boolean> {
  const errors = validateSettings();
  if (errors.length === 0) return true;

  const message = errors.map((e) => e.message).join("\n");
  const action = await vscode.window.showWarningMessage(
    `Locus: Configuration issue — ${message}`,
    "Open Settings"
  );

  if (action === "Open Settings") {
    vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "locusai"
    );
  }

  return false;
}
