import { describe, expect, test } from "bun:test";
import { buildCodexArgs } from "../src/ai/codex.js";

describe("buildCodexArgs", () => {
  test("uses codex exec full-auto and stdin prompt mode", () => {
    expect(buildCodexArgs()).toEqual([
      "exec",
      "--full-auto",
      "--skip-git-repo-check",
      "--json",
      "-",
    ]);
  });

  test("includes model without deprecated approval-mode flag", () => {
    const args = buildCodexArgs("gpt-5.3-codex");

    expect(args).toContain("--model");
    expect(args).toContain("gpt-5.3-codex");
    expect(args).not.toContain("--approval-mode");
    expect(args.at(-1)).toBe("-");
  });
});
