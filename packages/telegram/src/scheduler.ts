import { LocusClient } from "@locusai/sdk";
import { ProposalEngine } from "@locusai/sdk/node";
import { createClient, resolveWorkspaceId } from "./api-client.js";
import type { TelegramConfig } from "./config.js";
import { Notifier } from "./notifications.js";

const PROPOSAL_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Runs proposal cycles on a fixed interval inside the Telegram bot process.
 * Replaces the standalone `locus daemon` command.
 */
export class ProposalScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly config: TelegramConfig,
    private readonly notifier: Notifier
  ) {}

  /**
   * Start the proposal scheduler. Runs an initial cycle immediately,
   * then repeats every 6 hours.
   */
  async start(): Promise<void> {
    if (!this.config.apiKey) {
      console.log(
        "[scheduler] API key not configured — proposal scheduling disabled"
      );
      return;
    }

    console.log("[scheduler] Starting proposal scheduler (every 6 hours)");

    // Run initial cycle (don't block bot startup)
    this.runCycle();

    // Schedule recurring cycles
    this.timer = setInterval(() => this.runCycle(), PROPOSAL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log("[scheduler] Proposal scheduler stopped");
  }

  private async runCycle(): Promise<void> {
    if (this.running) {
      console.log("[scheduler] Proposal cycle already in progress, skipping");
      return;
    }

    this.running = true;
    const ts = new Date().toLocaleTimeString();
    console.log(`[scheduler] Running proposal cycle at ${ts}`);

    try {
      const client = createClient(this.config);
      const workspaceId = await resolveWorkspaceId(client, this.config);
      const engine = new ProposalEngine();

      const suggestions = await engine.runProposalCycle(
        this.config.projectPath,
        client,
        workspaceId
      );

      if (suggestions.length > 0) {
        console.log(`[scheduler] ${suggestions.length} proposal(s) generated`);
        for (const s of suggestions) {
          console.log(`[scheduler]   - ${s.title}`);
          this.notifier.notifyProposal(s).catch((err) => {
            console.error("[scheduler] Failed to notify proposal:", err);
          });
        }
      } else {
        console.log("[scheduler] No new proposals generated");
      }
    } catch (err) {
      console.error(
        `[scheduler] Proposal cycle failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      this.running = false;
    }
  }
}
