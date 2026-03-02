import { describe, expect, it } from "bun:test";
import {
  parseSandboxInstallArgs,
  parseSandboxLogsArgs,
} from "../src/commands/sandbox.js";

describe("sandbox command argument parsing", () => {
  it("parses install args with provider flag", () => {
    const result = parseSandboxInstallArgs(["bun", "--provider", "codex"]);
    expect(result.error).toBeUndefined();
    expect(result.provider).toBe("codex");
    expect(result.packages).toEqual(["bun"]);
  });

  it("returns install usage error when package is missing", () => {
    const result = parseSandboxInstallArgs(["--provider", "all"]);
    expect(result.error).toContain("Usage: locus sandbox install");
  });

  it("parses logs args with follow and tail", () => {
    const result = parseSandboxLogsArgs(["claude", "--follow", "--tail", "50"]);
    expect(result.error).toBeUndefined();
    expect(result.provider).toBe("claude");
    expect(result.follow).toBe(true);
    expect(result.tail).toBe(50);
  });

  it("returns logs error for unknown option", () => {
    const result = parseSandboxLogsArgs(["claude", "--bad"]);
    expect(result.error).toContain('Unknown option "--bad"');
  });
});
