import { spawn } from "node:child_process";
import { CodebaseIndex } from "@locusai/sdk/node";

export class TreeSummarizer {
  constructor(private projectPath: string) {}

  async summarize(tree: string): Promise<CodebaseIndex> {
    return new Promise((resolve, reject) => {
      const prompt = `Analyze this file tree and generate a JSON index.
Return ONLY a JSON object with this structure:
{
  "symbols": {},
  "responsibilities": { "path": "Description" }
}

File Tree:
${tree}`;

      const claude = spawn("claude", ["--print"], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: this.projectPath,
      });

      let output = "";
      let errorOutput = "";

      claude.stdout.on("data", (data) => {
        output += data.toString();
      });

      claude.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      claude.on("close", (code) => {
        if (code !== 0) {
          const errMsg =
            errorOutput.trim() || `Claude exited with code ${code}`;
          return reject(new Error(errMsg));
        }
        try {
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) resolve(JSON.parse(jsonMatch[0]));
          else reject(new Error("Could not find JSON in AI output"));
        } catch (e) {
          reject(e);
        }
      });

      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }
}
