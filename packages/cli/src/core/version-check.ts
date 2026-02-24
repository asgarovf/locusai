/**
 * Non-blocking startup version check.
 *
 * Checks for updates at most once every 24 hours.
 * Fires asynchronously — never blocks CLI startup.
 * Returns a function that prints the result AFTER command completes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { compareSemver, fetchLatestVersion } from "../commands/upgrade.js";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface VersionCheckState {
  lastCheck: string;
  latestVersion: string | null;
  checkForUpdates: boolean;
}

function getGlobalConfigDir(): string {
  return join(homedir(), ".locus");
}

function getVersionCheckPath(): string {
  return join(getGlobalConfigDir(), "version-check.json");
}

function loadVersionCheckState(): VersionCheckState {
  const path = getVersionCheckPath();
  if (!existsSync(path)) {
    return {
      lastCheck: "",
      latestVersion: null,
      checkForUpdates: true,
    };
  }

  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {
      lastCheck: "",
      latestVersion: null,
      checkForUpdates: true,
    };
  }
}

function saveVersionCheckState(state: VersionCheckState): void {
  const dir = getGlobalConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getVersionCheckPath(), JSON.stringify(state, null, 2), "utf-8");
}

function shouldCheck(state: VersionCheckState): boolean {
  if (!state.checkForUpdates) return false;
  if (!state.lastCheck) return true;

  const lastCheck = new Date(state.lastCheck).getTime();
  return Date.now() - lastCheck >= CHECK_INTERVAL_MS;
}

/**
 * Start a non-blocking version check in the background.
 * Returns a function that, when called, prints the update notice if available.
 * The returned function should be called AFTER the command completes.
 */
export function startVersionCheck(currentVersion: string): () => void {
  const state = loadVersionCheckState();

  if (!shouldCheck(state)) {
    // Not time to check yet. If we have a cached latest version, use it.
    if (
      state.latestVersion &&
      compareSemver(currentVersion, state.latestVersion) < 0
    ) {
      return () => {
        printUpdateNotice(currentVersion, state.latestVersion as string);
      };
    }
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    return () => {};
  }

  // Fire off the check asynchronously
  let resolvedLatest: string | null = null;
  let checkDone = false;

  // Use a promise but don't await it — fire and forget
  const checkPromise = new Promise<void>((resolve) => {
    // Run in next tick to not block startup
    setTimeout(() => {
      resolvedLatest = fetchLatestVersion();
      checkDone = true;

      // Save the check result
      const newState: VersionCheckState = {
        lastCheck: new Date().toISOString(),
        latestVersion: resolvedLatest,
        checkForUpdates: state.checkForUpdates,
      };
      try {
        saveVersionCheckState(newState);
      } catch {
        // Non-fatal
      }

      resolve();
    }, 0);
  });

  // Keep the event loop from waiting on this
  // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional swallow
  checkPromise.catch(() => {});

  return () => {
    if (checkDone && resolvedLatest) {
      if (compareSemver(currentVersion, resolvedLatest) < 0) {
        printUpdateNotice(currentVersion, resolvedLatest);
      }
    }
  };
}

function printUpdateNotice(current: string, latest: string): void {
  // Inline ANSI helpers to avoid circular deps at module level
  const yellow = (s: string) => `\x1b[33m${s}\x1b[39m`;
  const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;

  process.stderr.write(
    `\n${yellow("Update available:")} ${current} → ${bold(latest)}. Run ${bold("locus upgrade")} to update.\n`
  );
}

/** Disable version checks (for testing or user preference). */
export function setVersionCheckEnabled(enabled: boolean): void {
  const state = loadVersionCheckState();
  state.checkForUpdates = enabled;
  saveVersionCheckState(state);
}
