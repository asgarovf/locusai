import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LocusApiClient } from "../services/api-client";

const LOCUS_DIR = ".locus";
const SETTINGS_FILE = "settings.json";
const SETTINGS_SCHEMA = "https://locusai.dev/schemas/settings.schema.json";

/**
 * Run the `locus init` command in the workspace directory.
 * Returns true if the command succeeded.
 */
export function runLocusInit(projectPath: string): boolean {
  try {
    execSync("locus init", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 30000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Save an API key to .locus/settings.json.
 */
export function saveApiKey(projectPath: string, apiKey: string): void {
  const settingsPath = join(projectPath, LOCUS_DIR, SETTINGS_FILE);
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  } else {
    const locusDir = join(projectPath, LOCUS_DIR);
    if (!existsSync(locusDir)) {
      mkdirSync(locusDir, { recursive: true });
    }
  }

  const { $schema: _, ...rest } = settings;
  const ordered = { $schema: SETTINGS_SCHEMA, ...rest, apiKey };
  writeFileSync(settingsPath, JSON.stringify(ordered, null, 2), "utf-8");
}

/**
 * Save provider selection to .locus/settings.json.
 */
export function saveProvider(projectPath: string, provider: string): void {
  const settingsPath = join(projectPath, LOCUS_DIR, SETTINGS_FILE);
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  }

  const { $schema: _, ...rest } = settings;
  const ordered = { $schema: SETTINGS_SCHEMA, ...rest, provider };
  writeFileSync(settingsPath, JSON.stringify(ordered, null, 2), "utf-8");
}

/**
 * Fetch available workspaces from the API.
 * Returns an empty array if the request fails.
 */
export async function fetchWorkspaces(
  projectPath: string
): Promise<{ id: string; name: string }[]> {
  try {
    const client = new LocusApiClient(projectPath);
    if (!client.isConfigured()) {
      return [];
    }
    return await client.listWorkspaces();
  } catch {
    return [];
  }
}
