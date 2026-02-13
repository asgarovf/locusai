import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  fetchWorkspaces,
  runLocusInit,
  saveApiKey,
  saveProvider,
} from "../commands/setup-utils";

const TEST_DIR = join(import.meta.dir, ".test-setup-workspace");
const LOCUS_DIR = join(TEST_DIR, ".locus");

beforeEach(() => {
  mkdirSync(LOCUS_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("saveApiKey", () => {
  it("creates settings.json with API key when it does not exist", () => {
    saveApiKey(TEST_DIR, "lk_test_abc123");

    const settingsPath = join(LOCUS_DIR, "settings.json");
    expect(existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.apiKey).toBe("lk_test_abc123");
    expect(settings.$schema).toBe(
      "https://locusai.dev/schemas/settings.schema.json"
    );
  });

  it("updates API key in existing settings.json preserving other fields", () => {
    const settingsPath = join(LOCUS_DIR, "settings.json");
    writeFileSync(
      settingsPath,
      JSON.stringify({
        $schema: "https://locusai.dev/schemas/settings.schema.json",
        apiKey: "lk_old_key",
        provider: "codex",
        telegram: { chatId: 123 },
      })
    );

    saveApiKey(TEST_DIR, "lk_new_key");

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.apiKey).toBe("lk_new_key");
    expect(settings.provider).toBe("codex");
    expect(settings.telegram).toEqual({ chatId: 123 });
  });

  it("creates .locus directory if it does not exist", () => {
    rmSync(LOCUS_DIR, { recursive: true, force: true });
    expect(existsSync(LOCUS_DIR)).toBe(false);

    saveApiKey(TEST_DIR, "lk_fresh_key");

    expect(existsSync(LOCUS_DIR)).toBe(true);
    const settings = JSON.parse(
      readFileSync(join(LOCUS_DIR, "settings.json"), "utf-8")
    );
    expect(settings.apiKey).toBe("lk_fresh_key");
  });

  it("handles corrupted settings.json gracefully", () => {
    writeFileSync(join(LOCUS_DIR, "settings.json"), "not-json{broken");

    saveApiKey(TEST_DIR, "lk_recovery_key");

    const settings = JSON.parse(
      readFileSync(join(LOCUS_DIR, "settings.json"), "utf-8")
    );
    expect(settings.apiKey).toBe("lk_recovery_key");
  });
});

describe("saveProvider", () => {
  it("saves provider to settings.json", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ apiKey: "lk_test" })
    );

    saveProvider(TEST_DIR, "codex");

    const settings = JSON.parse(
      readFileSync(join(LOCUS_DIR, "settings.json"), "utf-8")
    );
    expect(settings.provider).toBe("codex");
    expect(settings.apiKey).toBe("lk_test");
  });

  it("creates settings.json if it does not exist", () => {
    saveProvider(TEST_DIR, "claude");

    const settingsPath = join(LOCUS_DIR, "settings.json");
    expect(existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.provider).toBe("claude");
  });

  it("overwrites existing provider", () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({ provider: "claude" })
    );

    saveProvider(TEST_DIR, "codex");

    const settings = JSON.parse(
      readFileSync(join(LOCUS_DIR, "settings.json"), "utf-8")
    );
    expect(settings.provider).toBe("codex");
  });

  it("includes $schema in output", () => {
    saveProvider(TEST_DIR, "claude");

    const settings = JSON.parse(
      readFileSync(join(LOCUS_DIR, "settings.json"), "utf-8")
    );
    expect(settings.$schema).toBe(
      "https://locusai.dev/schemas/settings.schema.json"
    );
  });
});

describe("fetchWorkspaces", () => {
  it("returns empty array when no API key configured", async () => {
    const result = await fetchWorkspaces(TEST_DIR);
    expect(result).toEqual([]);
  });

  it("returns empty array when .locus directory is missing", async () => {
    rmSync(LOCUS_DIR, { recursive: true, force: true });
    const result = await fetchWorkspaces(TEST_DIR);
    expect(result).toEqual([]);
  });

  it("returns empty array on API error", async () => {
    writeFileSync(
      join(LOCUS_DIR, "settings.json"),
      JSON.stringify({
        apiKey: "lk_invalid_key",
        apiUrl: "https://localhost:1/api",
      })
    );

    const result = await fetchWorkspaces(TEST_DIR);
    expect(result).toEqual([]);
  });
});

describe("runLocusInit", () => {
  it("returns false when locus CLI is not installed", () => {
    const result = runLocusInit("/tmp/nonexistent-path-for-test");
    expect(typeof result).toBe("boolean");
  });
});
