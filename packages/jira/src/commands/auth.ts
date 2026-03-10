/**
 * Auth command for locus-jira.
 *
 * Handles:
 *   - Default: prompt user to choose API Token or PAT, run flow, store credentials
 *   - --status: display current auth status
 *   - --revoke: clear stored credentials
 */

import { promptForApiToken } from "../auth/api-token.js";
import { promptForPAT } from "../auth/pat.js";
import { prompt } from "../auth/prompt.js";
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from "../config.js";

export async function authCommand(args: string[]): Promise<void> {
  const flag = args[0];

  if (flag === "--status") {
    return showStatus();
  }

  if (flag === "--revoke") {
    return handleRevoke();
  }

  return handleAuthFlow();
}

// ─── Auth Flow ──────────────────────────────────────────────────────────────

async function handleAuthFlow(): Promise<void> {
  const existing = loadCredentials();
  if (existing) {
    process.stderr.write(
      "  Already authenticated. Use --revoke to disconnect first, or --status to check.\n\n"
    );
    return;
  }

  process.stderr.write("\n  Choose authentication method:\n");
  process.stderr.write("    1) API Token  (Jira Cloud — email + token)\n");
  process.stderr.write("    2) PAT        (Jira Server / Data Center)\n\n");

  const choice = await prompt("  Enter 1 or 2: ");

  let credentials:
    | Awaited<ReturnType<typeof promptForApiToken>>
    | Awaited<ReturnType<typeof promptForPAT>>;

  if (choice === "1") {
    credentials = await promptForApiToken();
  } else if (choice === "2") {
    credentials = await promptForPAT();
  } else {
    process.stderr.write("  Invalid choice. Please enter 1 or 2.\n\n");
    process.exit(1);
  }

  saveCredentials(credentials);
  process.stderr.write("  Credentials saved to .locus/config.json\n");
  process.stderr.write("  Jira integration is ready.\n\n");
}

// ─── Status ─────────────────────────────────────────────────────────────────

function showStatus(): void {
  const creds = loadCredentials();

  if (!creds) {
    process.stderr.write("\n  Not authenticated.\n  Run: locus jira auth\n\n");
    return;
  }

  process.stderr.write("\n  Jira Auth Status\n");
  process.stderr.write(`  ${"─".repeat(40)}\n`);
  process.stderr.write(`  Method:     ${creds.method}\n`);

  if (creds.method === "api-token") {
    process.stderr.write(`  Instance:   ${creds.baseUrl}\n`);
    process.stderr.write(`  Email:      ${creds.email}\n`);
  } else if (creds.method === "pat") {
    process.stderr.write(`  Instance:   ${creds.baseUrl}\n`);
  } else if (creds.method === "oauth") {
    process.stderr.write(`  Cloud ID:   ${creds.cloudId}\n`);
  }

  process.stderr.write("\n");
}

// ─── Revoke ─────────────────────────────────────────────────────────────────

function handleRevoke(): void {
  const creds = loadCredentials();
  if (!creds) {
    process.stderr.write("\n  Not authenticated — nothing to revoke.\n\n");
    return;
  }

  clearCredentials();
  process.stderr.write("\n  Credentials cleared from .locus/config.json\n\n");
}
