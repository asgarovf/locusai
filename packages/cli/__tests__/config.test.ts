import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_CONFIG,
  getConfigPath,
  getNestedValue,
  isInitialized,
  loadConfig,
  saveConfig,
  updateConfigValue,
} from "../src/core/config.js";

const TEST_DIR = join(tmpdir(), `locus-test-config-${Date.now()}`);

function setupProject(config?: Record<string, unknown>): void {
  mkdirSync(join(TEST_DIR, ".locus"), { recursive: true });
  const configData = config ?? {
    version: "3.0.0",
    github: { owner: "test-owner", repo: "test-repo", defaultBranch: "main" },
    ai: { provider: "claude", model: "opus" },
    agent: {
      maxParallel: 3,
      autoLabel: true,
      autoPR: true,
      baseBranch: "main",
      rebaseBeforeTask: true,
    },
    sprint: { active: null, stopOnFailure: true },
    logging: { level: "normal", maxFiles: 20, maxTotalSizeMB: 50 },
  };
  writeFileSync(
    join(TEST_DIR, ".locus", "config.json"),
    JSON.stringify(configData, null, 2)
  );
}

describe("config", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("getConfigPath", () => {
    it("returns correct path", () => {
      expect(getConfigPath("/foo/bar")).toBe("/foo/bar/.locus/config.json");
    });
  });

  describe("isInitialized", () => {
    it("returns false when no config exists", () => {
      expect(isInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when config exists", () => {
      setupProject();
      expect(isInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("loadConfig", () => {
    it("throws when config file missing", () => {
      expect(() => loadConfig(TEST_DIR)).toThrow(/No Locus config found/);
    });

    it("throws on invalid JSON", () => {
      mkdirSync(join(TEST_DIR, ".locus"), { recursive: true });
      writeFileSync(join(TEST_DIR, ".locus", "config.json"), "not json at all");
      expect(() => loadConfig(TEST_DIR)).toThrow(/Failed to parse config/);
    });

    it("loads valid config", () => {
      setupProject();
      const config = loadConfig(TEST_DIR);
      expect(config.github.owner).toBe("test-owner");
      expect(config.github.repo).toBe("test-repo");
      expect(config.ai.provider).toBe("claude");
    });

    it("merges missing fields from defaults", () => {
      setupProject({
        version: "3.0.0",
        github: { owner: "o", repo: "r" },
      });
      const config = loadConfig(TEST_DIR);
      // Merged from defaults
      expect(config.github.defaultBranch).toBe("main");
      expect(config.ai.provider).toBe("claude");
      expect(config.agent.maxParallel).toBe(3);
      expect(config.sprint.stopOnFailure).toBe(true);
      expect(config.logging.level).toBe("normal");
    });

    it("preserves user values over defaults", () => {
      setupProject({
        version: "3.0.0",
        github: { owner: "custom", repo: "mine", defaultBranch: "develop" },
        ai: { provider: "codex", model: "gpt-4" },
      });
      const config = loadConfig(TEST_DIR);
      expect(config.github.owner).toBe("custom");
      expect(config.github.defaultBranch).toBe("develop");
      expect(config.ai.provider).toBe("codex");
      expect(config.ai.model).toBe("gpt-4");
    });

    it("infers provider from model on load", () => {
      setupProject({
        version: "3.0.0",
        github: { owner: "custom", repo: "mine", defaultBranch: "develop" },
        ai: { provider: "claude", model: "gpt-5.3-codex" },
      });
      const config = loadConfig(TEST_DIR);
      expect(config.ai.provider).toBe("codex");
      expect(config.ai.model).toBe("gpt-5.3-codex");
    });
  });

  describe("saveConfig", () => {
    it("creates .locus directory if missing", () => {
      const config = { ...DEFAULT_CONFIG };
      saveConfig(TEST_DIR, config);
      expect(existsSync(join(TEST_DIR, ".locus", "config.json"))).toBe(true);
    });

    it("saves and loads round-trip", () => {
      const config = {
        ...DEFAULT_CONFIG,
        github: { owner: "save-test", repo: "rt", defaultBranch: "main" },
      };
      saveConfig(TEST_DIR, config);
      const loaded = loadConfig(TEST_DIR);
      expect(loaded.github.owner).toBe("save-test");
    });
  });

  describe("getNestedValue", () => {
    it("gets top-level value", () => {
      expect(getNestedValue({ foo: "bar" }, "foo")).toBe("bar");
    });

    it("gets nested value", () => {
      expect(getNestedValue({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
    });

    it("returns undefined for missing path", () => {
      expect(getNestedValue({ a: 1 }, "b.c")).toBeUndefined();
    });

    it("handles null in path", () => {
      expect(getNestedValue({ a: null }, "a.b")).toBeUndefined();
    });
  });

  describe("updateConfigValue", () => {
    it("updates a nested value and saves", () => {
      setupProject();
      const updated = updateConfigValue(TEST_DIR, "ai.model", "sonnet");
      expect(updated.ai.model).toBe("sonnet");
      expect(updated.ai.provider).toBe("claude");
      // Verify it was persisted
      const reloaded = loadConfig(TEST_DIR);
      expect(reloaded.ai.model).toBe("sonnet");
      expect(reloaded.ai.provider).toBe("claude");
    });

    it("updates provider when model changes to codex", () => {
      setupProject();
      const updated = updateConfigValue(TEST_DIR, "ai.model", "gpt-5.3-codex");
      expect(updated.ai.model).toBe("gpt-5.3-codex");
      expect(updated.ai.provider).toBe("codex");
    });

    it("auto-coerces string 'true' to boolean", () => {
      setupProject();
      const updated = updateConfigValue(TEST_DIR, "agent.autoLabel", "false");
      expect(updated.agent.autoLabel).toBe(false);
    });

    it("auto-coerces string numbers to integers", () => {
      setupProject();
      const updated = updateConfigValue(TEST_DIR, "agent.maxParallel", "5");
      expect(updated.agent.maxParallel).toBe(5);
    });
  });
});
