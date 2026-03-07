/**
 * Team command for locus-linear.
 *
 * - `locus pkg linear team`       → show current team
 * - `locus pkg linear team <KEY>` → set active team key
 */

import { createLogger } from "@locusai/sdk";
import { loadLinearConfig, setTeamKey } from "../config.js";

const logger = createLogger("linear");

export function teamCommand(args: string[]): void {
  const newKey = args[0];

  if (!newKey) {
    return showTeam();
  }

  return setTeam(newKey);
}

function showTeam(): void {
  const config = loadLinearConfig();

  if (!config.teamKey) {
    process.stderr.write(
      "\n  No team configured.\n  Run: locus pkg linear team <KEY>  (e.g., ENG)\n\n"
    );
    return;
  }

  process.stderr.write(`\n  Active team: ${config.teamKey}\n\n`);
}

function setTeam(key: string): void {
  const normalized = key.toUpperCase();
  setTeamKey(normalized);
  logger.info(`Active team set to ${normalized}`);
  process.stderr.write(`\n  Active team set to: ${normalized}\n\n`);
}
