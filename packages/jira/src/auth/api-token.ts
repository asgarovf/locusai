/**
 * API Token authentication for Jira Cloud.
 *
 * Prompts the user for instance URL, email, and API token,
 * then validates by calling GET /rest/api/3/myself with Basic auth.
 */

import axios from "axios";
import { handleJiraError } from "../errors.js";
import type { JiraApiTokenCredentials } from "../types.js";
import { normalizeUrl, prompt } from "./prompt.js";

/**
 * Interactively prompt the user for Jira Cloud API token credentials
 * and validate them by calling the /rest/api/3/myself endpoint.
 */
export async function promptForApiToken(): Promise<JiraApiTokenCredentials> {
  process.stderr.write("\n  Jira Cloud — API Token Authentication\n\n");

  const rawUrl = await prompt(
    "  Jira instance URL (e.g. https://myteam.atlassian.net): "
  );
  if (!rawUrl) {
    throw new Error("Instance URL is required.");
  }
  const baseUrl = normalizeUrl(rawUrl);

  const email = await prompt("  Email: ");
  if (!email) {
    throw new Error("Email is required.");
  }

  const apiToken = await prompt("  API token: ", true);
  if (!apiToken) {
    throw new Error("API token is required.");
  }

  process.stderr.write("  Validating credentials...\n");

  const encoded = Buffer.from(`${email}:${apiToken}`).toString("base64");

  try {
    const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${encoded}`,
        Accept: "application/json",
      },
      timeout: 15_000,
    });

    const displayName =
      (response.data as Record<string, unknown>)?.displayName ?? email;
    process.stderr.write(`  Authenticated as: ${displayName}\n\n`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      handleJiraError(error);
    }
    throw error;
  }

  return {
    method: "api-token",
    email,
    apiToken,
    baseUrl,
  };
}
