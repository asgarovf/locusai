import { readFileSync } from "node:fs";
import type { ArtifactRepository } from "../repositories/artifact.repository.js";
import type { EventRepository } from "../repositories/event.repository.js";
import { ServiceError } from "./task.service.js";

export class CiService {
  constructor(
    private artifactRepo: ArtifactRepository,
    private eventRepo: EventRepository,
    private config: { ciPresetsPath: string; repoPath: string }
  ) {}

  async runCi(taskId: number | string, preset: string) {
    const presets = JSON.parse(
      readFileSync(this.config.ciPresetsPath, "utf-8")
    );
    const commands = presets[preset];
    if (!commands) throw new ServiceError(`Preset ${preset} not found`);

    const results = [];
    let allOk = true;
    let combinedOutput = "";

    for (const cmd of commands) {
      const start = Date.now();
      try {
        if (/[;&|><$`\n]/.test(cmd)) throw new Error("Invalid command");

        const proc = Bun.spawn(cmd.split(" "), {
          cwd: this.config.repoPath,
          stdout: "pipe",
          stderr: "pipe",
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        const duration = Date.now() - start;
        results.push({ cmd, exitCode, durationMs: duration });
        combinedOutput += `\n> ${cmd}\n${stdout}${stderr}\n`;
        if (exitCode !== 0) allOk = false;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ cmd, exitCode: -1, error: message });
        allOk = false;
        combinedOutput += `\n> ${cmd}\nError: ${message}\n`;
      }
    }

    const summary = allOk ? "All checks passed" : "Some checks failed";

    this.artifactRepo.create({
      taskId: Number(taskId),
      type: "CI_OUTPUT",
      title: `CI Run: ${preset}`,
      contentText: combinedOutput,
      createdBy: "system",
    });

    this.eventRepo.create(taskId, "CI_RAN", { preset, ok: allOk, summary });

    return { ok: allOk, preset, commands: results, summary };
  }
}
