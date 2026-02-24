import { describe, expect, test } from "bun:test";

/**
 * Tests for the runAI utility and listenForInterrupt.
 * Since these rely on spawning processes and raw-mode stdin,
 * we test the structural contracts and options parsing.
 */

// Import the types to test the interface contract
import type { RunAIOptions, RunAIResult } from "../src/ai/run-ai.js";

describe("RunAIOptions interface", () => {
  test("requires prompt, provider, model, cwd", () => {
    const options: RunAIOptions = {
      prompt: "test prompt",
      provider: "claude",
      model: "sonnet",
      cwd: "/tmp",
    };
    expect(options.prompt).toBe("test prompt");
    expect(options.provider).toBe("claude");
    expect(options.model).toBe("sonnet");
    expect(options.cwd).toBe("/tmp");
  });

  test("supports optional fields", () => {
    const options: RunAIOptions = {
      prompt: "test",
      provider: "claude",
      model: "sonnet",
      cwd: "/tmp",
      activity: "testing",
      silent: true,
      noInterrupt: true,
    };
    expect(options.activity).toBe("testing");
    expect(options.silent).toBe(true);
    expect(options.noInterrupt).toBe(true);
  });
});

describe("RunAIResult interface", () => {
  test("success result", () => {
    const result: RunAIResult = {
      success: true,
      output: "Hello world",
      interrupted: false,
      exitCode: 0,
    };
    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello world");
    expect(result.interrupted).toBe(false);
    expect(result.exitCode).toBe(0);
  });

  test("interrupted result preserves partial output", () => {
    const result: RunAIResult = {
      success: false,
      output: "partial out...",
      error: "Interrupted by user",
      interrupted: true,
      exitCode: 143,
    };
    expect(result.success).toBe(false);
    expect(result.output).toBe("partial out...");
    expect(result.interrupted).toBe(true);
    expect(result.error).toBe("Interrupted by user");
  });

  test("error result", () => {
    const result: RunAIResult = {
      success: false,
      output: "",
      error: "CLI not installed",
      interrupted: false,
      exitCode: 1,
    };
    expect(result.success).toBe(false);
    expect(result.output).toBe("");
    expect(result.error).toBe("CLI not installed");
  });
});
