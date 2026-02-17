import { describe, it, expect } from "bun:test";
import { createAiRunner } from "../factory.js";
import {
  PROVIDER,
  CLAUDE_MODELS,
  CODEX_MODELS,
  DEFAULT_MODEL,
  isValidModelForProvider,
  getModelsForProvider,
} from "../../core/config.js";

describe("isValidModelForProvider", () => {
  it("accepts opus for claude provider", () => {
    expect(isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.OPUS)).toBe(
      true
    );
  });

  it("accepts sonnet for claude provider", () => {
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.SONNET)
    ).toBe(true);
  });

  it("accepts haiku for claude provider", () => {
    expect(isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.HAIKU)).toBe(
      true
    );
  });

  it("accepts full model IDs for claude provider", () => {
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.CLAUDE_OPUS_4_6)
    ).toBe(true);
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.CLAUDE_SONNET_4_5)
    ).toBe(true);
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.CLAUDE_SONNET_4_6)
    ).toBe(true);
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.CLAUDE_HAIKU_4_5)
    ).toBe(true);
  });

  it("accepts opusplan for claude provider", () => {
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CLAUDE_MODELS.OPUS_PLAN)
    ).toBe(true);
  });

  it("rejects claude models for codex provider", () => {
    expect(isValidModelForProvider(PROVIDER.CODEX, CLAUDE_MODELS.OPUS)).toBe(
      false
    );
    expect(isValidModelForProvider(PROVIDER.CODEX, CLAUDE_MODELS.SONNET)).toBe(
      false
    );
    expect(isValidModelForProvider(PROVIDER.CODEX, CLAUDE_MODELS.HAIKU)).toBe(
      false
    );
  });

  it("accepts gpt-5.3-codex for codex provider", () => {
    expect(
      isValidModelForProvider(PROVIDER.CODEX, CODEX_MODELS.GPT_5_3_CODEX)
    ).toBe(true);
  });

  it("accepts all codex models for codex provider", () => {
    expect(
      isValidModelForProvider(
        PROVIDER.CODEX,
        CODEX_MODELS.GPT_5_3_CODEX_SPARK
      )
    ).toBe(true);
    expect(
      isValidModelForProvider(PROVIDER.CODEX, CODEX_MODELS.GPT_5_CODEX_MINI)
    ).toBe(true);
    expect(
      isValidModelForProvider(PROVIDER.CODEX, CODEX_MODELS.GPT_5_2_CODEX)
    ).toBe(true);
  });

  it("rejects codex models for claude provider", () => {
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, CODEX_MODELS.GPT_5_3_CODEX)
    ).toBe(false);
    expect(
      isValidModelForProvider(
        PROVIDER.CLAUDE,
        CODEX_MODELS.GPT_5_3_CODEX_SPARK
      )
    ).toBe(false);
  });

  it("rejects unknown model for any provider", () => {
    expect(isValidModelForProvider(PROVIDER.CLAUDE, "unknown-model")).toBe(
      false
    );
    expect(isValidModelForProvider(PROVIDER.CODEX, "unknown-model")).toBe(
      false
    );
  });

  it("rejects empty string model", () => {
    expect(isValidModelForProvider(PROVIDER.CLAUDE, "")).toBe(false);
    expect(isValidModelForProvider(PROVIDER.CODEX, "")).toBe(false);
  });
});

describe("getModelsForProvider", () => {
  it("returns claude models for claude provider", () => {
    const models = getModelsForProvider(PROVIDER.CLAUDE);
    expect(models).toContain(CLAUDE_MODELS.OPUS);
    expect(models).toContain(CLAUDE_MODELS.SONNET);
    expect(models).toContain(CLAUDE_MODELS.HAIKU);
    expect(models).toContain(CLAUDE_MODELS.OPUS_PLAN);
    expect(models).toContain(CLAUDE_MODELS.CLAUDE_OPUS_4_6);
    expect(models).toContain(CLAUDE_MODELS.CLAUDE_SONNET_4_5);
    expect(models).toContain(CLAUDE_MODELS.CLAUDE_SONNET_4_6);
    expect(models).toContain(CLAUDE_MODELS.CLAUDE_HAIKU_4_5);
  });

  it("returns codex models for codex provider", () => {
    const models = getModelsForProvider(PROVIDER.CODEX);
    expect(models).toContain(CODEX_MODELS.GPT_5_3_CODEX);
    expect(models).toContain(CODEX_MODELS.GPT_5_3_CODEX_SPARK);
    expect(models).toContain(CODEX_MODELS.GPT_5_CODEX_MINI);
    expect(models).toContain(CODEX_MODELS.GPT_5_2_CODEX);
  });

  it("does not include codex models in claude provider list", () => {
    const models = getModelsForProvider(PROVIDER.CLAUDE);
    for (const codexModel of Object.values(CODEX_MODELS)) {
      expect(models).not.toContain(codexModel);
    }
  });

  it("does not include claude models in codex provider list", () => {
    const models = getModelsForProvider(PROVIDER.CODEX);
    for (const claudeModel of Object.values(CLAUDE_MODELS)) {
      expect(models).not.toContain(claudeModel);
    }
  });
});

describe("createAiRunner", () => {
  it("throws when model is invalid for provider", () => {
    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
        model: "opus",
      })
    ).toThrow(/not valid for provider/);
  });

  it("throws with descriptive error mentioning the invalid model", () => {
    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
        model: "opus",
      })
    ).toThrow(/opus/);
  });

  it("throws with error listing valid models for the provider", () => {
    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
        model: "opus",
      })
    ).toThrow(/gpt-5\.3-codex/);
  });

  it("throws when using codex model with claude provider", () => {
    expect(() =>
      createAiRunner(PROVIDER.CLAUDE, {
        projectPath: "/tmp/test",
        model: "gpt-5.3-codex",
      })
    ).toThrow(/not valid for provider/);
  });

  it("throws with error listing valid claude models", () => {
    expect(() =>
      createAiRunner(PROVIDER.CLAUDE, {
        projectPath: "/tmp/test",
        model: "gpt-5.3-codex",
      })
    ).toThrow(/opus/);
  });

  it("throws for unknown model with any provider", () => {
    expect(() =>
      createAiRunner(PROVIDER.CLAUDE, {
        projectPath: "/tmp/test",
        model: "unknown-model",
      })
    ).toThrow(/not valid for provider/);

    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
        model: "unknown-model",
      })
    ).toThrow(/not valid for provider/);
  });

  it("does not throw for valid claude model", () => {
    expect(() =>
      createAiRunner(PROVIDER.CLAUDE, {
        projectPath: "/tmp/test",
        model: CLAUDE_MODELS.SONNET,
      })
    ).not.toThrow();
  });

  it("does not throw for valid codex model", () => {
    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
        model: CODEX_MODELS.GPT_5_3_CODEX,
      })
    ).not.toThrow();
  });

  it("does not throw for all valid claude models", () => {
    for (const model of Object.values(CLAUDE_MODELS)) {
      expect(() =>
        createAiRunner(PROVIDER.CLAUDE, {
          projectPath: "/tmp/test",
          model,
        })
      ).not.toThrow();
    }
  });

  it("does not throw for all valid codex models", () => {
    for (const model of Object.values(CODEX_MODELS)) {
      expect(() =>
        createAiRunner(PROVIDER.CODEX, {
          projectPath: "/tmp/test",
          model,
        })
      ).not.toThrow();
    }
  });

  it("uses default model when none specified", () => {
    expect(() =>
      createAiRunner(PROVIDER.CLAUDE, {
        projectPath: "/tmp/test",
      })
    ).not.toThrow();
  });

  it("uses default model for codex when none specified", () => {
    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
      })
    ).not.toThrow();
  });

  it("defaults to claude provider when provider is undefined", () => {
    expect(() =>
      createAiRunner(undefined, {
        projectPath: "/tmp/test",
        model: CLAUDE_MODELS.SONNET,
      })
    ).not.toThrow();
  });

  it("rejects codex model when provider is undefined (defaults to claude)", () => {
    expect(() =>
      createAiRunner(undefined, {
        projectPath: "/tmp/test",
        model: CODEX_MODELS.GPT_5_3_CODEX,
      })
    ).toThrow(/not valid for provider/);
  });

  it("uses default model with undefined provider", () => {
    expect(() =>
      createAiRunner(undefined, {
        projectPath: "/tmp/test",
      })
    ).not.toThrow();
  });

  it("error message includes the provider name", () => {
    expect(() =>
      createAiRunner(PROVIDER.CODEX, {
        projectPath: "/tmp/test",
        model: "opus",
      })
    ).toThrow(/codex/);
  });
});

describe("DEFAULT_MODEL", () => {
  it("has a default model for claude provider", () => {
    expect(DEFAULT_MODEL[PROVIDER.CLAUDE]).toBeDefined();
    expect(
      isValidModelForProvider(PROVIDER.CLAUDE, DEFAULT_MODEL[PROVIDER.CLAUDE])
    ).toBe(true);
  });

  it("has a default model for codex provider", () => {
    expect(DEFAULT_MODEL[PROVIDER.CODEX]).toBeDefined();
    expect(
      isValidModelForProvider(PROVIDER.CODEX, DEFAULT_MODEL[PROVIDER.CODEX])
    ).toBe(true);
  });

  it("default claude model is opus", () => {
    expect(DEFAULT_MODEL[PROVIDER.CLAUDE]).toBe(CLAUDE_MODELS.OPUS);
  });

  it("default codex model is gpt-5.3-codex", () => {
    expect(DEFAULT_MODEL[PROVIDER.CODEX]).toBe(CODEX_MODELS.GPT_5_3_CODEX);
  });
});
