/**
 * Helpers for spawning the `locus` CLI binary from within a community package.
 *
 * Both functions resolve `locus` from the current `PATH`, so the user must
 * have `@locusai/cli` installed globally (or the binary otherwise available).
 */

import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";

/** Result returned by {@link invokeLocus}. */
export interface LocusInvokeResult {
  /** Captured stdout from the locus process. */
  stdout: string;
  /** Captured stderr from the locus process. */
  stderr: string;
  /** Exit code; `0` indicates success. */
  exitCode: number;
}

/**
 * Spawn `locus` with the given arguments and capture its output.
 *
 * The process inherits the current environment. Resolves when the child
 * process exits.
 *
 * @example
 * ```ts
 * const result = await invokeLocus(["run", "42"]);
 * if (result.exitCode !== 0) {
 *   console.error("locus failed:", result.stderr);
 * }
 * ```
 *
 * @param args - Arguments to pass after `locus`, e.g. `["run", "42"]`.
 * @param cwd  - Working directory for the child process. Defaults to
 *               `process.cwd()`.
 */
export function invokeLocus(
  args: string[],
  cwd?: string
): Promise<LocusInvokeResult> {
  return new Promise((resolve) => {
    const result = spawnSync("locus", args, {
      cwd: cwd ?? process.cwd(),
      encoding: "utf-8",
      env: process.env,
      shell: false,
    });

    resolve({
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.status ?? 1,
    });
  });
}

/**
 * Spawn `locus` with the given arguments and return the raw {@link ChildProcess}
 * for streaming.
 *
 * Unlike {@link invokeLocus} this does **not** buffer output — you can attach
 * listeners to `child.stdout` and `child.stderr` directly, or set `stdio` to
 * `"inherit"` to forward streams to the parent process.
 *
 * @example
 * ```ts
 * const child = invokeLocusStream(["run", "42"]);
 * child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
 * child.on("exit", (code) => console.log("exited with", code));
 * ```
 *
 * @param args  - Arguments to pass after `locus`, e.g. `["run", "42"]`.
 * @param cwd   - Working directory for the child process. Defaults to
 *                `process.cwd()`.
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
