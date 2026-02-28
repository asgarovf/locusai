/**
 * Image path detection for the REPL.
 * Detects file paths in user input that point to images
 * (screenshots, diagrams, etc.) for multi-modal AI input.
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";

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

const STABLE_DIR = join(tmpdir(), "locus-images");
const PLACEHOLDER_SCHEME = "locus://screenshot-";
const PLACEHOLDER_ID_PATTERN = /\(locus:\/\/screenshot-(\d+)\)/g;

export interface DetectedImage {
  /** Original path from user input. */
  originalPath: string;
  /** Absolute resolved path (used for dedupe). */
  resolvedPath: string;
  /** Stable path (copied to /tmp/locus-images/). */
  stablePath: string;
  /** File exists on disk. */
  exists: boolean;
  /** Raw path-like text fragments found in input for this image. */
  rawMatches: string[];
}

/**
 * Detect image file paths in user input.
 * Handles:
 * - macOS escaped-space paths: Screenshot\ 2026-02-21.png
 * - Quoted paths: "path/to/image.png"
 * - ~/expansion: ~/Desktop/screenshot.png
 * - Plain paths: /tmp/image.png
 */
export function detectImages(input: string): DetectedImage[] {
  const detected: DetectedImage[] = [];
  const byResolved = new Map<string, DetectedImage>();

  // Strip existing image placeholders so we don't re-detect display names
  // inside already-normalized ![Screenshot: ...](locus://screenshot-N) markers.
  const sanitized = input.replace(
    /!\[Screenshot:[^\]]*\]\(locus:\/\/screenshot-\d+\)/g,
    ""
  );

  for (const line of sanitized.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const unquoted = stripQuotes(trimmed);
    if (
      (unquoted.startsWith("/") ||
        unquoted.startsWith("~/") ||
        unquoted.startsWith("./")) &&
      hasImageExtension(unquoted)
    ) {
      addIfImage(unquoted, trimmed, detected, byResolved);
    }
  }

  // Pattern 1: Quoted paths
  const quotedPattern = /["']([^"']+\.(?:png|jpg|jpeg|gif|webp|bmp|svg))["']/gi;
  for (const match of sanitized.matchAll(quotedPattern)) {
    if (!match[0] || !match[1]) continue;
    addIfImage(match[1], match[0], detected, byResolved);
  }

  // Pattern 2: macOS escaped spaces (word\ word.ext)
  // NOTE: Use alternation (?:[^\s"'\\]|\\ )+ instead of nested quantifiers
  // (?:[^\s"'\\]+(?:\\[ ])?)+  to avoid catastrophic backtracking in V8/Node.js
  // on long inputs like URLs that don't end with an image extension.
  const escapedPattern =
    /(?:\/|~\/|\.\/)?(?:[^\s"'\\]|\\ )+\.(?:png|jpg|jpeg|gif|webp|bmp|svg|tiff?)/gi;
  for (const match of sanitized.matchAll(escapedPattern)) {
    if (!match[0]) continue;
    const path = match[0].replace(/\\ /g, " ");
    addIfImage(path, match[0], detected, byResolved);
  }

  // Pattern 3: Regular paths (no spaces)
  const plainPattern =
    /(?:\/|~\/|\.\/)[^\s"']+\.(?:png|jpg|jpeg|gif|webp|bmp|svg|tiff?)/gi;
  for (const match of sanitized.matchAll(plainPattern)) {
    if (!match[0]) continue;
    addIfImage(match[0], match[0], detected, byResolved);
  }

  return detected;
}

/**
 * Build context instructions for detected images.
 * Returns a string to prepend to the prompt, or empty string.
 */
export function buildImageContext(images: DetectedImage[]): string {
  const existing = images.filter((img) => img.exists);
  if (existing.length === 0) return "";

  const deduped = dedupeByResolvedPath(existing);
  const instructions = deduped.map((img) => `- ${img.stablePath}`);

  return `\n\n[The user attached images. Use the Read tool on these paths:\n${instructions.join("\n")}\n]`;
}

export interface ImageAttachment extends DetectedImage {
  /** Numeric attachment id used in placeholders. */
  id: string;
  /** Short filename for UI display. */
  displayName: string;
  /** Placeholder inserted into editor text. */
  placeholder: string;
}

export function buildImagePlaceholder(id: string, displayName: string): string {
  return `![Screenshot: ${displayName}](${PLACEHOLDER_SCHEME}${id})`;
}

export function normalizeImagePlaceholders(
  input: string,
  existingAttachments: ImageAttachment[] = [],
  nextId = 1
): { text: string; attachments: ImageAttachment[]; nextId: number } {
  const attachments = [...existingAttachments];
  let nextAttachmentId = nextId;
  const byResolved = new Map<string, ImageAttachment>();
  for (const attachment of attachments) {
    byResolved.set(attachment.resolvedPath, attachment);
  }

  let text = input;
  const detected = detectImages(input);

  for (const image of detected) {
    let attachment = byResolved.get(image.resolvedPath);
    if (!attachment) {
      const id = String(nextAttachmentId);
      nextAttachmentId += 1;
      attachment = {
        ...image,
        id,
        displayName: basename(image.originalPath),
        placeholder: buildImagePlaceholder(id, basename(image.originalPath)),
      };
      attachments.push(attachment);
      byResolved.set(image.resolvedPath, attachment);
    } else {
      attachment.rawMatches = uniqueStrings([
        ...attachment.rawMatches,
        ...image.rawMatches,
      ]);
    }

    text = replaceImageMentions(text, image, attachment.placeholder);
  }

  return { text, attachments, nextId: nextAttachmentId };
}

export function collectReferencedAttachments(
  input: string,
  attachments: ImageAttachment[]
): DetectedImage[] {
  const ids = new Set<string>();
  for (const match of input.matchAll(PLACEHOLDER_ID_PATTERN)) {
    if (match[1]) ids.add(match[1]);
  }

  const selected = attachments.filter((attachment) => ids.has(attachment.id));
  return dedupeByResolvedPath(selected);
}

/**
 * Relocate image stable copies into a directory inside the project root.
 * This ensures images are accessible when the AI runs inside a Docker sandbox
 * (which only syncs the workspace directory, not the OS temp directory).
 */
export function relocateImages(
  images: DetectedImage[],
  projectRoot: string
): void {
  const targetDir = join(projectRoot, ".locus", "tmp", "images");

  for (const img of images) {
    if (!img.exists) continue;
    try {
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      const dest = join(targetDir, basename(img.stablePath));
      copyFileSync(img.stablePath, dest);
      img.stablePath = dest;
    } catch {
      // Keep original path if copy fails
    }
  }
}

// ─── Internal ───────────────────────────────────────────────────────────────

function addIfImage(
  rawPath: string,
  rawMatch: string,
  detected: DetectedImage[],
  byResolved: Map<string, DetectedImage>
): void {
  const ext = extname(rawPath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return;

  // Expand ~ and resolve path.
  let resolved = stripQuotes(rawPath).replace(/\\ /g, " ");
  if (resolved.startsWith("~/")) {
    resolved = join(homedir(), resolved.slice(2));
  }
  resolved = resolve(resolved);

  const existing = byResolved.get(resolved);
  if (existing) {
    existing.rawMatches = uniqueStrings([
      ...existing.rawMatches,
      rawMatch,
      rawPath,
      stripQuotes(rawPath),
    ]);
    return;
  }

  const exists = existsSync(resolved);
  let stablePath = resolved;

  // Copy to stable temp dir if file exists.
  if (exists) {
    stablePath = copyToStable(resolved);
  }

  const image: DetectedImage = {
    originalPath: rawPath,
    resolvedPath: resolved,
    stablePath,
    exists,
    rawMatches: uniqueStrings([rawMatch, rawPath, stripQuotes(rawPath)]),
  };

  detected.push(image);
  byResolved.set(resolved, image);
}

function hasImageExtension(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}

function stripQuotes(text: string): string {
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function replaceImageMentions(
  input: string,
  image: DetectedImage,
  placeholder: string
): string {
  const candidates = new Set<string>(image.rawMatches);
  candidates.add(image.originalPath);
  candidates.add(stripQuotes(image.originalPath));
  candidates.add(image.originalPath.replace(/ /g, "\\ "));

  let output = input;
  const sortedCandidates = [...candidates].sort((a, b) => b.length - a.length);
  for (const candidate of sortedCandidates) {
    if (!candidate) continue;
    output = output.split(candidate).join(placeholder);
  }

  return output;
}

function dedupeByResolvedPath(images: DetectedImage[]): DetectedImage[] {
  const seen = new Set<string>();
  const deduped: DetectedImage[] = [];

  for (const image of images) {
    if (seen.has(image.resolvedPath)) continue;
    seen.add(image.resolvedPath);
    deduped.push(image);
  }

  return deduped;
}

function copyToStable(sourcePath: string): string {
  try {
    if (!existsSync(STABLE_DIR)) {
      mkdirSync(STABLE_DIR, { recursive: true });
    }
    const dest = join(STABLE_DIR, `${Date.now()}-${basename(sourcePath)}`);
    copyFileSync(sourcePath, dest);
    return dest;
  } catch {
    return sourcePath;
  }
}
