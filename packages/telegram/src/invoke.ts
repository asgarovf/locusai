/**
 * Minimal `locus` CLI invocation helper.
 *
 * Mirrors the interface of `@locusai/sdk`'s `invokeLocus` / `invokeLocusStream`
 * but is inlined here so `locus-telegram` remains self-contained and does not
 * require the SDK to be pre-built before installation.
 *
 * For more advanced usage (config reading, structured logging) see `@locusai/sdk`.
 */

import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";

export interface LocusInvokeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run `locus <args>` and capture the output.
 * Blocks until the child process exits.
 */
export function invokeLocus(
  args: string[],
  cwd?: string
): LocusInvokeResult {
  const result = spawnSync("locus", args, {
    cwd: cwd ?? process.cwd(),
    encoding: "utf-8",
    env: process.env,
    shell: false,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

/**
 * Spawn `locus <args>` and return the raw ChildProcess for streaming output.
 */
export function invokeLocusStream(
  args: string[],
  cwd?: string
): ChildProcess {
  return spawn("locus", args, {
    cwd: cwd ?? process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
    shell: false,
  });
}
