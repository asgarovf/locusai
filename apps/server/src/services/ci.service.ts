/**
 * CI Service
 */

import type { ArtifactRepository } from "../repositories/artifact.repository.js";
import type { EventRepository } from "../repositories/event.repository.js";

export class CiService {
  constructor(
    private artifactRepo: ArtifactRepository,
    private eventRepo: EventRepository
  ) {}

  /**
   * Record a remote CI execution directly (no prior event)
   */
  async recordRemoteCi(
    taskId: number,
    result: { preset: string; commands: { cmd: string; exitCode: number }[] }
  ): Promise<void> {
    const allOk = result.commands.every((c) => c.exitCode === 0);
    const summary = allOk ? "All checks passed" : "Some checks failed";

    await Promise.all([
      // 1. Create CI_RAN event
      this.eventRepo.create({
        taskId,
        type: "CI_RAN",
        payload: {
          preset: result.preset,
          ok: allOk,
          summary,
          source: "remote-agent",
          deferred: false,
          processed: true,
          commands: result.commands,
        },
        createdAt: new Date(),
      }),

      // 2. Create CI_OUTPUT artifact
      this.artifactRepo.create({
        taskId,
        type: "CI_OUTPUT",
        title: `CI Run: ${result.preset} (Remote)`,
        contentText: result.commands
          .map((c) => `> ${c.cmd}\nResult: ${c.exitCode}`)
          .join("\n"),
        createdBy: "remote-agent",
        createdAt: new Date(),
      }),
    ]);
  }
}
