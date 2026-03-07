/**
 * Sync state tracking for Linear ↔ GitHub issue mappings.
 *
 * Manages `.locus/linear/sync-state.json` — tracks which Linear issues
 * map to which GitHub Issues, with timestamps for conflict detection.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { IssueMapping, SyncState } from "../types.js";

const SYNC_STATE_PATH = ".locus/linear/sync-state.json";

const DEFAULT_SYNC_STATE: SyncState = {
  lastSyncAt: null,
  lastImportAt: null,
  lastExportAt: null,
  mappings: [],
};

function getSyncStatePath(cwd?: string): string {
  return join(cwd ?? process.cwd(), SYNC_STATE_PATH);
}

/**
 * Load sync state from `.locus/linear/sync-state.json`.
 * Creates the file with defaults on first run.
 */
export function loadState(cwd?: string): SyncState {
  const filePath = getSyncStatePath(cwd);

  if (!existsSync(filePath)) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, `${JSON.stringify(DEFAULT_SYNC_STATE, null, 2)}\n`);
    return { ...DEFAULT_SYNC_STATE, mappings: [] };
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SyncState>;
    return {
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastImportAt: parsed.lastImportAt ?? null,
      lastExportAt: parsed.lastExportAt ?? null,
      mappings: Array.isArray(parsed.mappings) ? parsed.mappings : [],
    };
  } catch {
    return { ...DEFAULT_SYNC_STATE, mappings: [] };
  }
}

/**
 * Save sync state to `.locus/linear/sync-state.json`.
 */
export function saveState(state: SyncState, cwd?: string): void {
  const filePath = getSyncStatePath(cwd);
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * Get a mapping by Linear issue ID.
 */
export function getMapping(
  state: SyncState,
  linearId: string
): IssueMapping | undefined {
  return state.mappings.find((m) => m.linearId === linearId);
}

/**
 * Get a mapping by GitHub issue number.
 */
export function getMappingByGithubIssue(
  state: SyncState,
  githubIssueNumber: number
): IssueMapping | undefined {
  return state.mappings.find((m) => m.githubIssueNumber === githubIssueNumber);
}

/**
 * Add a new issue mapping to the sync state and persist.
 */
export function addMapping(
  mapping: IssueMapping,
  cwd?: string
): void {
  const state = loadState(cwd);

  const existing = state.mappings.findIndex(
    (m) => m.linearId === mapping.linearId
  );
  if (existing !== -1) {
    state.mappings[existing] = mapping;
  } else {
    state.mappings.push(mapping);
  }

  saveState(state, cwd);
}

/**
 * Update an existing mapping by Linear issue ID.
 * Merges the provided partial fields into the existing mapping.
 */
export function updateMapping(
  linearId: string,
  updates: Partial<IssueMapping>,
  cwd?: string
): boolean {
  const state = loadState(cwd);
  const idx = state.mappings.findIndex((m) => m.linearId === linearId);
  if (idx === -1) return false;

  state.mappings[idx] = { ...state.mappings[idx], ...updates };
  saveState(state, cwd);
  return true;
}

/**
 * Remove a mapping by Linear issue ID.
 */
export function removeMapping(linearId: string, cwd?: string): boolean {
  const state = loadState(cwd);
  const before = state.mappings.length;
  state.mappings = state.mappings.filter((m) => m.linearId !== linearId);
  if (state.mappings.length === before) return false;
  saveState(state, cwd);
  return true;
}
