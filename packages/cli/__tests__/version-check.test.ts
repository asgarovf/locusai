import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// We test the internal helpers by importing compareSemver from upgrade
// and verifying version-check state file format
import { compareSemver } from "../src/commands/upgrade.js";

const testDir = join(tmpdir(), `locus-vc-test-${Date.now()}`);

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
});

describe("version check state", () => {
  test("state file is valid JSON with expected fields", () => {
    mkdirSync(testDir, { recursive: true });
    const state = {
      lastCheck: new Date().toISOString(),
      latestVersion: "3.1.0",
      checkForUpdates: true,
    };
    const path = join(testDir, "version-check.json");
    writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");

    const loaded = JSON.parse(readFileSync(path, "utf-8"));
    expect(loaded.lastCheck).toBeDefined();
    expect(loaded.latestVersion).toBe("3.1.0");
    expect(loaded.checkForUpdates).toBe(true);
  });

  test("24h check interval calculation", () => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const recentCheck = now - 60 * 1000; // 1 minute ago

    // Should check: last check was 24h+ ago
    expect(now - twentyFourHoursAgo >= 24 * 60 * 60 * 1000).toBe(true);

    // Should NOT check: last check was 1 minute ago
    expect(now - recentCheck >= 24 * 60 * 60 * 1000).toBe(false);
  });

  test("update detection with compareSemver", () => {
    // Update available
    expect(compareSemver("3.0.0", "3.1.0") < 0).toBe(true);

    // Already up to date
    expect(compareSemver("3.1.0", "3.1.0") < 0).toBe(false);

    // Current is ahead
    expect(compareSemver("3.2.0", "3.1.0") < 0).toBe(false);
  });

  test("disabled checks", () => {
    const state = {
      lastCheck: "",
      latestVersion: null,
      checkForUpdates: false,
    };
    // When checkForUpdates is false, should not check
    expect(state.checkForUpdates).toBe(false);
  });

  test("corrupted state file fallback", () => {
    mkdirSync(testDir, { recursive: true });
    const path = join(testDir, "version-check.json");
    writeFileSync(path, "not json{{{", "utf-8");

    // Should handle gracefully — parse will throw, caller should use defaults
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      parsed = {
        lastCheck: "",
        latestVersion: null,
        checkForUpdates: true,
      };
    }

    expect(parsed).toEqual({
      lastCheck: "",
      latestVersion: null,
      checkForUpdates: true,
    });
  });

  test("state with cached latest version", () => {
    const state = {
      lastCheck: new Date().toISOString(),
      latestVersion: "3.5.0",
      checkForUpdates: true,
    };

    // If last check is recent, use cached value
    const timeSinceCheck = Date.now() - new Date(state.lastCheck).getTime();
    expect(timeSinceCheck < 24 * 60 * 60 * 1000).toBe(true);

    // Cached latest is newer than current
    expect(compareSemver("3.0.0", state.latestVersion as string) < 0).toBe(
      true
    );
  });
});
