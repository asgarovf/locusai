/**
 * Main entry point for locus-linear.
 *
 * Dispatches subcommands for Linear integration:
 *   - auth: OAuth setup and token management
 *   - import: Linear → GitHub issue import
 *   - export: GitHub → Linear status export
 *   - sync: Bidirectional sync (import + export)
 *   - create: AI-assisted issue creation in Linear
 *   - issues: List Linear issues
 *   - issue: Show single issue details
 *   - team: Team selection
 *   - mapping: Show/edit state & label mappings
 *
 * Usage:
 *   locus pkg linear auth          → Complete OAuth flow
 *   locus pkg linear import        → Import Linear issues to GitHub
 *   locus pkg linear issues        → List issues from configured team
 */

import type { LinearCommand } from "./types.js";
import { authCommand } from "./commands/auth.js";
import { createCommand } from "./commands/create.js";
import { exportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { issueCommand } from "./commands/issue.js";
import { issuesCommand } from "./commands/issues.js";
import { mappingCommand } from "./commands/mapping.js";
import { syncCommand } from "./commands/sync.js";
import { teamCommand } from "./commands/team.js";

export { LocusLinearClient } from "./client.js";
export type { LocusLinearClientOptions } from "./client.js";
export {
  loadLinearConfig,
  validateLinearConfig,
  saveLinearConfig,
  saveTokens,
  clearTokens,
  setTeamKey,
  loadTokens,
} from "./config.js";
export {
  isTokenExpired,
  refreshAccessToken,
  revokeToken,
} from "./auth/token.js";
export { runOAuthFlow } from "./auth/oauth.js";
export { authCommand } from "./commands/auth.js";
export { createCommand } from "./commands/create.js";
export { exportCommand } from "./commands/export.js";
export { importCommand } from "./commands/import.js";
export { issueCommand } from "./commands/issue.js";
export { issuesCommand } from "./commands/issues.js";
export { mappingCommand } from "./commands/mapping.js";
export { syncCommand } from "./commands/sync.js";
export { teamCommand } from "./commands/team.js";
export {
  loadState,
  saveState,
  getMapping,
  getMappingByGithubIssue,
  addMapping,
  updateMapping,
  removeMapping,
} from "./sync/state.js";
export {
  mapPriority,
  reverseMapPriority,
  mapState,
  reverseMapState,
  mapLabels,
  mapAssignee,
  buildGitHubIssuePayload,
} from "./sync/mapper.js";
export type { GitHubIssuePayload } from "./sync/mapper.js";
export { runImport } from "./sync/importer.js";
export type { ImportOptions, ImportResult } from "./sync/importer.js";
export { runExport } from "./sync/exporter.js";
export type { ExportOptions, ExportResult } from "./sync/exporter.js";
export { aiEnrichIssue } from "./ai/create.js";
export type { AiIssueResult } from "./ai/create.js";

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  switch (command) {
    case "auth":
      return authCommand(args.slice(1));
    case "import":
      return importCommand(args.slice(1));
    case "export":
      return exportCommand(args.slice(1));
    case "sync":
      return syncCommand(args.slice(1));
    case "create":
      return createCommand(args.slice(1));
    case "issues":
      return issuesCommand(args.slice(1));
    case "issue":
      return issueCommand(args.slice(1));
    case "team":
      return teamCommand(args.slice(1));
    case "mapping":
      return mappingCommand(args.slice(1));
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
  locus-linear — Linear integration for Locus

  Usage:
    locus pkg linear <command>

  Authentication:
    auth                          Complete OAuth flow (opens browser)
    auth --status                 Show current auth status
    auth --revoke                 Revoke OAuth token

  Team:
    team                          Show current team
    team <KEY>                    Set active team (e.g., ENG)

  Sync:
    import                        Import Linear issues → GitHub Issues
    import --cycle                Import only from active cycle
    import --project "Name"       Import from specific project
    import --dry-run              Preview without creating issues
    import --enrich               AI-enrich issues during import
    export                        Export Locus status updates → Linear
    export --dry-run              Preview without updating Linear
    sync                          Bidirectional: import + export
    sync --dry-run                Preview both directions

  AI-Powered:
    create "<title>"              AI-assisted issue creation in Linear
    create "<title>" --no-ai      Create plain issue without AI enrichment

  Query:
    issues                        List issues from configured team
    issues --cycle                List issues in active cycle
    issue <ID>                    Show single issue details (e.g., ENG-123)

  Mapping:
    mapping                       Show state & label mappings

  Examples:
    locus pkg linear auth
    locus pkg linear import --cycle --dry-run
    locus pkg linear import --project "Backend"
    locus pkg linear create "Add rate limiting to the API"
    locus pkg linear issues --cycle
    locus pkg linear issue ENG-123
  `);
}

export type {
  ImportFilter,
  IssueMapping,
  LinearCommand,
  LinearConfig,
  LinearCycle,
  LinearIssue,
  LinearLabel,
  LinearTeam,
  LinearWorkflowState,
  SyncState,
  TokenInfo,
} from "./types.js";
