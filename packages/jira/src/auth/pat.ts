/**
 * Personal Access Token (PAT) authentication for Jira Server / Data Center.
 *
 * Prompts the user for instance URL and PAT,
 * then validates by calling GET /rest/api/2/myself with Bearer auth.
 */

import axios from "axios";
import { handleJiraError } from "../errors.js";
import type { JiraPatCredentials } from "../types.js";
import { normalizeUrl, prompt } from "./prompt.js";

/**
 * Interactively prompt the user for Jira Server/DC PAT credentials
 * and validate them by calling the /rest/api/2/myself endpoint.
 */
export async function promptForPAT(): Promise<JiraPatCredentials> {
  process.stderr.write(
    "\n  Jira Server / Data Center — PAT Authentication\n\n"
  );

  const rawUrl = await prompt(
    "  Jira instance URL (e.g. https://jira.mycompany.com): "
  );
  if (!rawUrl) {
    throw new Error("Instance URL is required.");
  }
  const baseUrl = normalizeUrl(rawUrl);

  const patToken = await prompt("  Personal access token: ", true);
  if (!patToken) {
    throw new Error("Personal access token is required.");
  }

  process.stderr.write("  Validating credentials...\n");

  try {
    const response = await axios.get(`${baseUrl}/rest/api/2/myself`, {
      headers: {
        Authorization: `Bearer ${patToken}`,
        Accept: "application/json",
      },
      timeout: 15_000,
    });

    const displayName =
      (response.data as Record<string, unknown>)?.displayName ?? "user";
    process.stderr.write(`  Authenticated as: ${displayName}\n\n`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      handleJiraError(error);
    }
    throw error;
  }

  return {
    method: "pat",
    patToken,
    baseUrl,
  };
}
