import { spawn } from "node:child_process";
import { DEFAULT_MODEL } from "./config";

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
        reject(new Error(`Failed to start Claude CLI: ${err.message}`))
      );
      claude.on("close", (code) => {
        if (code === 0) resolve(output);
        else
          reject(new Error(`Claude exited with code ${code}: ${errorOutput}`));
      });

      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }
}
