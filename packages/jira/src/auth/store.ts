/**
 * Credential store for @locusai/locus-jira.
 *
 * Re-exports the credential persistence functions from config.ts.
 * Credentials are stored in `.locus/config.json` under `packages.jira.auth`.
 * Environment variables (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PAT)
 * take precedence over stored config when present.
 */

export {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from "../config.js";
