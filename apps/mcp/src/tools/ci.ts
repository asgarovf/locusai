import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost, error, success } from "../api.js";
import { projectDir } from "../config.js";

export function registerCiTools(server: McpServer): void {
  server.registerTool(
    "ci.run",
    {
      title: "Run CI",
      description:
        "Run a CI preset (e.g., 'quick' or 'full') for a task locally and report results",
      inputSchema: {
        taskId: z.number(),
        preset: z.string(),
      },
    },
    async ({ taskId, preset }) => {
      try {
        // 1. Read Presets
        const presetsPath = join(projectDir, "ci-presets.json");
        const presets = JSON.parse(readFileSync(presetsPath, "utf-8"));
        const commands = presets[preset];

        if (!commands || !Array.isArray(commands)) {
          return error(`Preset '${preset}' not found in ci-presets.json`);
        }

        const results: {
          cmd: string;
          exitCode: number;
          durationMs?: number;
          error?: string;
        }[] = [];

        let allOk = true;

        // 2. Execute Commands Locally
        for (const cmd of commands) {
          const start = Date.now();
          try {
            const args = cmd.split(" ");
            const proc = Bun.spawn(args, {
              cwd: projectDir,
              stdout: "pipe",
              stderr: "pipe",
            });

            // Wait for completion
            const exitCode = await proc.exited;
            const durationMs = Date.now() - start;

            results.push({ cmd, exitCode, durationMs });
            if (exitCode !== 0) allOk = false;
          } catch (e) {
            results.push({
              cmd,
              exitCode: -1,
              error: e instanceof Error ? e.message : String(e),
            });
            allOk = false;
          }
        }

        const summary = allOk ? "All checks passed" : "Some checks failed";

        // 0. Get Project ID from Task
        const taskData = await apiGet<{ projectId: string }>(
          `/tasks/${taskId}`
        );
        if (!taskData || !taskData.projectId) {
          return error("Could not determine Project ID for task");
        }

        // 3. Report Results to Server
        const { data } = await apiPost<{ message: string }>("/ci/record", {
          taskId,
          projectId: taskData.projectId,
          result: {
            preset,
            ok: allOk,
            summary,
            commands: results,
          },
        });

        return success({
          ...data,
          localExecution: true,
          summary,
        });
      } catch (e) {
        return error(String(e));
      }
    }
  );
}
