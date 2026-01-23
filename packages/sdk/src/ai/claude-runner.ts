import { spawn } from "node:child_process";
import { DEFAULT_MODEL } from "../core/config.js";

export class ClaudeRunner {
  constructor(
    private projectPath: string,
    private model: string = DEFAULT_MODEL
  ) {}

  run(prompt: string, _isPlanning = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "--dangerously-skip-permissions",
        "--print",
        "--model",
        this.model,
      ];

      const claude = spawn("claude", args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        shell: true,
      });

      let output = "";
      let errorOutput = "";

      claude.stdout.on("data", (data) => {
        output += data.toString();
        process.stdout.write(data.toString());
      });
      claude.stderr.on("data", (data) => {
        errorOutput += data.toString();
        process.stderr.write(data.toString());
      });

      claude.on("error", (err) =>
        reject(
          new Error(
            `Failed to start Claude CLI (shell: true): ${err.message}. Please ensure the 'claude' command is available in your PATH.`
          )
        )
      );
      claude.on("close", (code) => {
        if (code === 0) resolve(output);
        else {
          const detail = errorOutput.trim();
          const message = detail
            ? `Claude CLI error (exit code ${code}): ${detail}`
            : `Claude CLI exited with code ${code}. Please ensure the Claude CLI is installed and you are logged in (run 'claude' manually to check).`;
          reject(new Error(message));
        }
      });

      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }
}
