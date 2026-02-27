import { describe, expect, test } from "bun:test";

/**
 * Tests for the runAI utility and listenForInterrupt.
 * Since these rely on spawning processes and raw-mode stdin,
 * we test the structural contracts and options parsing.
 */

// Import the types to test the interface contract
import type { RunAIOptions, RunAIResult } from "../src/ai/run-ai.js";
import { runAI } from "../src/ai/run-ai.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../src/types.js";

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

class FakeRunner implements AgentRunner {
  name = "fake-runner";
  constructor(private result: RunnerResult) {}
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async getVersion(): Promise<string> {
    return "0.0.0";
  }
  async execute(_options: RunnerOptions): Promise<RunnerResult> {
    return this.result;
  }
  abort(): void {
    // noop
  }
}

describe("runAI", () => {
  test("uses fallback error when runner returns whitespace-only error", async () => {
    const result = await runAI({
      prompt: "test",
      provider: "codex",
      model: "gpt-5",
      cwd: "/tmp",
      noInterrupt: true,
      silent: true,
      runner: new FakeRunner({
        success: false,
        output: "",
        error: " \n\t ",
        exitCode: 17,
      }),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("fake-runner failed with exit code 17.");
  });

  test("uses non-empty output line when runner error is whitespace", async () => {
    const result = await runAI({
      prompt: "test",
      provider: "codex",
      model: "gpt-5",
      cwd: "/tmp",
      noInterrupt: true,
      silent: true,
      runner: new FakeRunner({
        success: false,
        output: "sandbox failed: permission denied\n",
        error: " \r\n ",
        exitCode: 1,
      }),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("sandbox failed: permission denied");
  });

  test("extracts message field from JSONL output when runner error is whitespace", async () => {
    const result = await runAI({
      prompt: "test",
      provider: "codex",
      model: "gpt-5",
      cwd: "/tmp",
      noInterrupt: true,
      silent: true,
      runner: new FakeRunner({
        success: false,
        output:
          '{"type":"event","message":"model gpt-5 is not available in this environment"}\n',
        error: "\n\t",
        exitCode: 1,
      }),
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "model gpt-5 is not available in this environment"
    );
  });
});
