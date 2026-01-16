import type { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { Router } from "express";

export function createCiRouter(
  db: Database,
  config: { ciPresetsPath: string; repoPath: string }
) {
  const router = Router();

  router.post("/run", async (req, res) => {
    const { taskId, preset } = req.body;
    const presets = JSON.parse(readFileSync(config.ciPresetsPath, "utf-8"));
    const commands = presets[preset];
    if (!commands)
      return res
        .status(400)
        .json({ error: { message: `Preset ${preset} not found` } });

    const results = [];
    let allOk = true;
    let combinedOutput = "";

    for (const cmd of commands) {
      const start = Date.now();
      try {
        // Security check
        if (/[;&|><$`\n]/.test(cmd)) throw new Error("Invalid command");

        const proc = Bun.spawn(cmd.split(" "), {
          cwd: config.repoPath,
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
    const now = Date.now();

    // Save as CI_OUTPUT artifact
    db.prepare(`
      INSERT INTO artifacts (taskId, type, title, contentText, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      "CI_OUTPUT",
      `CI Run: ${preset}`,
      combinedOutput,
      "system",
      now
    );

    db.prepare(
      "INSERT INTO events (taskId, type, payload, createdAt) VALUES (?, ?, ?, ?)"
    ).run(
      taskId as string,
      "CI_RAN",
      JSON.stringify({ preset, ok: allOk, summary }),
      now
    );

    res.json({ ok: allOk, preset, commands: results, summary });
  });

  return router;
}
