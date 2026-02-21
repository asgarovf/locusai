/**
 * Detect image file paths in user input.
 *
 * Handles:
 * - Paths with escaped spaces (macOS screenshot drag): /path/to/Screenshot\ 2026-02-21.png
 * - Paths with normal spaces (whole-line): /path/to/Screenshot 2026-02-21.png
 * - Simple paths without spaces: /path/to/image.png
 * - Home-relative paths: ~/Desktop/screenshot.png
 * - Quoted paths: '/path/to/file.png' or "/path/to/file.png"
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".tif",
  ".tiff",
]);

export interface DetectedImage {
  /** Normalized filesystem path */
  path: string;
  /** Stable copy path (used for Read instruction if file was copied) */
  stablePath: string;
  /** Original raw text as it appeared in the input (for stripping) */
  raw: string;
  /** Whether the file exists (original or copy) */
  exists: boolean;
}

/** Directory for stable image copies */
const STABLE_IMAGE_DIR = join(tmpdir(), "locus-images");

/**
 * Check if a path ends with a known image extension.
 */
function hasImageExtension(p: string): boolean {
  const dot = p.lastIndexOf(".");
  if (dot === -1) return false;
  return IMAGE_EXTENSIONS.has(p.slice(dot).toLowerCase());
}

/**
 * Resolve a raw path string to a normalized filesystem path.
 * Unescapes backslash-spaces and expands `~`.
 */
function resolvePath(raw: string): string {
  let p = raw.replace(/\\ /g, " ").trim();
  // Strip surrounding quotes
  if (
    (p.startsWith("'") && p.endsWith("'")) ||
    (p.startsWith('"') && p.endsWith('"'))
  ) {
    p = p.slice(1, -1);
  }
  if (p.startsWith("~/")) {
    p = homedir() + p.slice(1);
  }
  return p;
}

/**
 * Copy an image file to a stable temp directory so it's available
 * even if the original (e.g. macOS screenshot temp) gets deleted.
 */
function copyToStable(srcPath: string): string | null {
  try {
    mkdirSync(STABLE_IMAGE_DIR, { recursive: true });
    const ts = Date.now();
    const name = `${ts}-${basename(srcPath)}`;
    const destPath = join(STABLE_IMAGE_DIR, name);
    copyFileSync(srcPath, destPath);
    return destPath;
  } catch {
    return null;
  }
}

/**
 * Scan user input for image file paths.
 * Detection is pattern-based. If a file exists, it's copied to a stable
 * temp directory for reliable reading by the AI.
 */
export function detectImages(input: string): DetectedImage[] {
  const seen = new Set<string>();
  const images: DetectedImage[] = [];

  const tryAdd = (raw: string): void => {
    const normalized = resolvePath(raw);
    if (!normalized || seen.has(normalized)) return;
    if (!hasImageExtension(normalized)) return;
    seen.add(normalized);

    let exists = false;
    let stablePath = normalized;

    try {
      exists = existsSync(normalized);
    } catch {
      // Invalid path
    }

    // Copy to stable location so the file is available when Claude reads it
    if (exists) {
      const copied = copyToStable(normalized);
      if (copied) {
        stablePath = copied;
      }
    }

    images.push({ path: normalized, stablePath, raw: raw.trim(), exists });
  };

  // 1. Try each line as a complete path (handles paths with unescaped spaces)
  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    // Strip surrounding quotes for the startsWith check
    const unquoted = trimmed.replace(/^['"]|['"]$/g, "");
    if (unquoted.startsWith("/") || unquoted.startsWith("~/")) {
      tryAdd(trimmed);
    }
  }

  // 2. Find paths with escaped spaces: /path/to/some\ file.png
  const escapedRe =
    /(?:~\/|\/)[^\s]*(?:\\ [^\s]*)*\.(png|jpe?g|gif|webp|bmp|svg|tiff?)\b/gi;
  for (const match of input.matchAll(escapedRe)) {
    tryAdd(match[0]);
  }

  // 3. Find simple paths without spaces: /path/to/file.png
  const simpleRe = /(?:~\/|\/)\S+\.(png|jpe?g|gif|webp|bmp|svg|tiff?)\b/gi;
  for (const match of input.matchAll(simpleRe)) {
    tryAdd(match[0]);
  }

  return images;
}

/**
 * Get the display name for an image path.
 */
export function imageDisplayName(imagePath: string): string {
  return basename(imagePath);
}

/**
 * Strip detected image paths from user input, leaving only the non-path text.
 */
export function stripImagePaths(
  input: string,
  images: DetectedImage[]
): string {
  if (images.length === 0) return input;

  let result = input;
  for (const img of images) {
    // Remove the raw path text (may appear with escaped or unescaped spaces)
    result = result.replace(img.raw, "");
    // Also try removing the resolved path (in case it differs)
    if (img.raw !== img.path) {
      result = result.replace(img.path, "");
    }
  }

  // Clean up leftover blank lines and whitespace
  return result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

/**
 * Build an image context instruction to append to a prompt.
 * Uses the stable copy path so Claude can read files that may have been
 * deleted from their original location.
 */
export function buildImageContext(images: DetectedImage[]): string {
  if (images.length === 0) return "";

  const existingImages = images.filter((img) => img.exists);
  if (existingImages.length === 0) return "";

  const pathList = existingImages
    .map((img) => `- ${img.stablePath}`)
    .join("\n");
  const noun = existingImages.length === 1 ? "an image" : "images";
  const pronoun = existingImages.length === 1 ? "it" : "them";

  return `\n\n[The user has attached ${noun}. Use the Read tool to view ${pronoun}:\n${pathList}\n]`;
}
