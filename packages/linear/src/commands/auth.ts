/**
 * Auth command for locus-linear.
 *
 * Handles:
 *   - Default: run OAuth PKCE flow, then auto-detect team/mappings
 *   - --status: display current auth status
 *   - --revoke: revoke token and clear credentials
 */

import { LinearClient } from "@linear/sdk";
import { createLogger } from "@locusai/sdk";
import { runOAuthFlow } from "../auth/oauth.js";
import { loadTokens, revokeToken } from "../auth/token.js";
import { loadLinearConfig, saveLinearConfig } from "../config.js";
import type { LinearConfig, TokenInfo } from "../types.js";

const logger = createLogger("linear");

const DEFAULT_CLIENT_ID = "7714a6775ffffb95b0a313b3870c4d6f";

export async function authCommand(args: string[]): Promise<void> {
  const flag = args[0];

  if (flag === "--status") {
    return showStatus();
  }

  if (flag === "--revoke") {
    return handleRevoke();
  }

  return handleOAuthFlow();
}

// ─── OAuth Flow ──────────────────────────────────────────────────────────────

async function handleOAuthFlow(): Promise<void> {
  const existing = loadTokens();
  if (existing) {
    process.stderr.write(
      "  Already authenticated. Use --revoke to disconnect first, or --status to check.\n\n"
    );
  }

  try {
    const result = await runOAuthFlow({ clientId: DEFAULT_CLIENT_ID });

    if (result.cancelled) {
      process.stderr.write("  Authorization was cancelled.\n\n");
      return;
    }

    logger.info("Authentication successful");

    // Auto-detect team, workflow states, and labels
    await autoDetect(result.tokens);

    process.stderr.write("  Linear integration is ready.\n\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timed out")) {
      process.stderr.write("  OAuth flow timed out. Please try again.\n\n");
    } else {
      process.stderr.write(`  Authentication failed: ${msg}\n\n`);
    }
    process.exit(1);
  }
}

// ─── Status ──────────────────────────────────────────────────────────────────

function showStatus(): void {
  const config = loadLinearConfig();

  if (!config.auth) {
    process.stderr.write(
      "\n  Not authenticated.\n  Run: locus pkg linear auth\n\n"
    );
    return;
  }

  const expiresAt = new Date(config.auth.expiresAt);
  const now = new Date();
  const expired = expiresAt <= now;
  const expiryLabel = expired
    ? "EXPIRED"
    : `${formatRelativeTime(expiresAt.getTime() - now.getTime())}`;

  process.stderr.write("\n  Linear Auth Status\n");
  process.stderr.write(`  ${"─".repeat(40)}\n`);
  process.stderr.write(`  Token:      ${expired ? "expired" : "valid"}\n`);
  process.stderr.write(
    `  Expires:    ${expiresAt.toLocaleString()} (${expiryLabel})\n`
  );
  process.stderr.write(`  Scope:      ${config.auth.scope || "unknown"}\n`);
  process.stderr.write(`  Team:       ${config.teamKey ?? "not set"}\n`);

  const stateCount = Object.keys(config.stateMapping).length;
  const labelCount = Object.keys(config.labelMapping).length;
  process.stderr.write(`  States:     ${stateCount} mapped\n`);
  process.stderr.write(`  Labels:     ${labelCount} mapped\n\n`);
}

function formatRelativeTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(ms / (1000 * 60));
    return `in ${mins}m`;
  }
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

// ─── Revoke ──────────────────────────────────────────────────────────────────

async function handleRevoke(): Promise<void> {
  const tokens = loadTokens();
  if (!tokens) {
    process.stderr.write("\n  Not authenticated — nothing to revoke.\n\n");
    return;
  }

  try {
    await revokeToken(tokens.accessToken);
    logger.info("Token revoked and credentials cleared");
    process.stderr.write("\n  Token revoked. Local credentials cleared.\n\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n  Revocation failed: ${msg}\n\n`);
    process.exit(1);
  }
}

// ─── Auto-Detection ──────────────────────────────────────────────────────────

async function autoDetect(tokens: TokenInfo): Promise<void> {
  const client = new LinearClient({ accessToken: tokens.accessToken });
  const config = loadLinearConfig();

  process.stderr.write("\n  Detecting team and configuration...\n");

  // Fetch teams
  let teamId: string;
  let teamKey: string;
  try {
    const teamsConnection = await client.teams();
    const teams = teamsConnection.nodes;

    if (teams.length === 0) {
      process.stderr.write("  No teams found in your Linear workspace.\n");
      return;
    }

    if (teams.length === 1) {
      teamId = teams[0].id;
      teamKey = teams[0].key;
      process.stderr.write(`  Team: ${teams[0].name} (${teamKey})\n`);
    } else {
      // Multiple teams — pick the first and inform the user
      teamId = teams[0].id;
      teamKey = teams[0].key;
      process.stderr.write(`  Found ${teams.length} teams:\n`);
      for (const t of teams) {
        const marker = t.id === teamId ? " (selected)" : "";
        process.stderr.write(`    - ${t.name} (${t.key})${marker}\n`);
      }
      process.stderr.write(`  Change with: locus pkg linear team <KEY>\n`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`  Could not fetch teams: ${msg}\n`);
    saveConfig(config, tokens);
    return;
  }

  config.teamKey = teamKey;

  // Fetch workflow states for the team
  try {
    const team = await client.team(teamId);
    const statesConnection = await team.states();
    const states = statesConnection.nodes;

    const stateMapping: Record<string, string> = {};
    for (const s of states) {
      // Map Linear state type → GitHub label
      switch (s.type) {
        case "backlog":
          stateMapping[s.name] = "backlog";
          break;
        case "unstarted":
          stateMapping[s.name] = "todo";
          break;
        case "started":
          stateMapping[s.name] = "in-progress";
          break;
        case "completed":
          stateMapping[s.name] = "done";
          break;
        case "cancelled":
          stateMapping[s.name] = "cancelled";
          break;
        default:
          stateMapping[s.name] = s.type;
      }
    }
    config.stateMapping = stateMapping;
    process.stderr.write(`  States: ${states.length} workflow states mapped\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`  Could not fetch workflow states: ${msg}\n`);
  }

  // Fetch labels for the team
  try {
    const team = await client.team(teamId);
    const labelsConnection = await team.labels();
    const labels = labelsConnection.nodes;

    const labelMapping: Record<string, string> = {};
    for (const l of labels) {
      // Default: map Linear label name → same name as GitHub label
      labelMapping[l.name] = l.name.toLowerCase().replace(/\s+/g, "-");
    }
    config.labelMapping = labelMapping;
    process.stderr.write(`  Labels: ${labels.length} labels mapped\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`  Could not fetch labels: ${msg}\n`);
  }

  saveConfig(config, tokens);
}

function saveConfig(config: LinearConfig, tokens: TokenInfo): void {
  config.auth = tokens;
  saveLinearConfig(config);
}
