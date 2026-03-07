// ---------------------------------------------------------------------------
// Skills Marketplace – remote registry client
// ---------------------------------------------------------------------------

import type { RemoteSkillEntry, RemoteSkillRegistry } from "./types.js";
import { REGISTRY_BRANCH, REGISTRY_REPO } from "./types.js";

const RAW_BASE = `https://raw.githubusercontent.com/${REGISTRY_REPO}/${REGISTRY_BRANCH}`;

/**
 * Fetch the full skill registry from GitHub.
 */
export async function fetchRegistry(): Promise<RemoteSkillRegistry> {
  const url = `${RAW_BASE}/registry.json`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `Failed to reach the skill registry at ${url}: ${(err as Error).message}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch skill registry (HTTP ${res.status}). Check your network connection and try again.`
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Skill registry returned invalid JSON.");
  }

  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as RemoteSkillRegistry).skills)
  ) {
    throw new Error(
      "Skill registry has an unexpected format (missing 'skills' array)."
    );
  }

  return data as RemoteSkillRegistry;
}

/**
 * Fetch the raw SKILL.md content for a single skill from the registry.
 */
export async function fetchSkillContent(path: string): Promise<string> {
  const url = `${RAW_BASE}/${path}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `Failed to fetch skill file at ${url}: ${(err as Error).message}`
    );
  }

  if (res.status === 404) {
    throw new Error(`Skill not found: ${path}`);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch skill file (HTTP ${res.status}): ${path}`);
  }

  return res.text();
}

/**
 * Look up a skill by name in an already-fetched registry.
 */
export function findSkillInRegistry(
  registry: RemoteSkillRegistry,
  name: string
): RemoteSkillEntry | undefined {
  return registry.skills.find((s) => s.name === name);
}
