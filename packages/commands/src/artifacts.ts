import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getLocusPath } from "@locusai/sdk/node";

export interface ArtifactInfo {
  name: string;
  fileName: string;
  createdAt: Date;
  size: number;
}

/**
 * List artifacts sorted by creation time (newest first).
 */
export function listArtifacts(projectPath: string): ArtifactInfo[] {
  const artifactsDir = getLocusPath(projectPath, "artifactsDir");

  if (!existsSync(artifactsDir)) {
    return [];
  }

  const files = readdirSync(artifactsDir).filter((f) => f.endsWith(".md"));

  return files
    .map((fileName) => {
      const filePath = join(artifactsDir, fileName);
      const stat = statSync(filePath);
      const name = fileName.replace(/\.md$/, "");

      return {
        name,
        fileName,
        createdAt: stat.birthtime,
        size: stat.size,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Read an artifact's content by name (with or without .md extension).
 */
export function readArtifact(
  projectPath: string,
  name: string
): { content: string; info: ArtifactInfo } | null {
  const artifactsDir = getLocusPath(projectPath, "artifactsDir");
  const fileName = name.endsWith(".md") ? name : `${name}.md`;
  const filePath = join(artifactsDir, fileName);

  if (!existsSync(filePath)) {
    return null;
  }

  const stat = statSync(filePath);
  const content = readFileSync(filePath, "utf-8");

  return {
    content,
    info: {
      name: fileName.replace(/\.md$/, ""),
      fileName,
      createdAt: stat.birthtime,
      size: stat.size,
    },
  };
}

/**
 * Find an artifact by exact or partial name match.
 *
 * Returns:
 * - `{ match, content, info }` if exactly one artifact matches
 * - `{ ambiguous: ArtifactInfo[] }` if multiple artifacts match
 * - `null` if no artifacts match
 */
export function findArtifact(
  projectPath: string,
  name: string
):
  | { match: true; content: string; info: ArtifactInfo }
  | { match: false; ambiguous: ArtifactInfo[] }
  | null {
  // Try exact match first
  const exact = readArtifact(projectPath, name);
  if (exact) {
    return { match: true, content: exact.content, info: exact.info };
  }

  // Try partial match
  const artifacts = listArtifacts(projectPath);
  const matches = artifacts.filter((a) =>
    a.name.toLowerCase().includes(name.toLowerCase())
  );

  if (matches.length === 1) {
    const result = readArtifact(projectPath, matches[0].name);
    if (result) {
      return { match: true, content: result.content, info: result.info };
    }
  }

  if (matches.length > 1) {
    return { match: false, ambiguous: matches };
  }

  return null;
}

/**
 * Format file size for display.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}

/**
 * Format a date for display.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
