/**
 * Sync command for locus-linear.
 *
 * Runs import (Linear → GitHub) then export (GitHub → Linear) sequentially.
 *
 * Usage:
 *   locus pkg linear sync              → full bidirectional sync
 *   locus pkg linear sync --dry-run    → preview both directions
 */

import { importCommand } from "./import.js";
import { exportCommand } from "./export.js";

export async function syncCommand(args: string[]): Promise<void> {
  // Pass all args to import (supports --cycle, --project, --dry-run, --enrich)
  process.stderr.write("\n  === Phase 1: Import (Linear → GitHub) ===\n\n");
  await importCommand(args);

  // Only pass --dry-run to export (other import flags don't apply)
  const exportArgs = args.includes("--dry-run") ? ["--dry-run"] : [];
  process.stderr.write("\n  === Phase 2: Export (GitHub → Linear) ===\n\n");
  await exportCommand(exportArgs);

  process.stderr.write("  Sync complete.\n\n");
}
