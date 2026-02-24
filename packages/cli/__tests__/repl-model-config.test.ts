import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../src/core/config.js";
import { persistReplModelSelection } from "../src/repl/model-config.js";

const TEST_DIR = join(tmpdir(), `locus-test-repl-model-config-${Date.now()}`);

describe("repl model config persistence", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    const initialConfig = {
      version: "3.0.0",
      github: { owner: "test-owner", repo: "test-repo", defaultBranch: "main" },
      ai: { provider: "claude" as const, model: "claude-sonnet-4-6" },
      agent: {
        maxParallel: 3,
        autoLabel: true,
        autoPR: true,
        baseBranch: "main",
        rebaseBeforeTask: true,
      },
      sprint: { active: null, stopOnFailure: true },
      logging: { level: "normal" as const, maxFiles: 20, maxTotalSizeMB: 50 },
    };
    saveConfig(TEST_DIR, initialConfig);
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("persists model switch to config and infers provider", () => {
    const inMemoryConfig = loadConfig(TEST_DIR);

    persistReplModelSelection(TEST_DIR, inMemoryConfig, "gpt-5.3-codex");

    expect(inMemoryConfig.ai.model).toBe("gpt-5.3-codex");
    expect(inMemoryConfig.ai.provider).toBe("codex");

    const reloaded = loadConfig(TEST_DIR);
    expect(reloaded.ai.model).toBe("gpt-5.3-codex");
    expect(reloaded.ai.provider).toBe("codex");
  });
});
