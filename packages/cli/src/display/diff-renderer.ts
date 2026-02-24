/**
 * Colored unified diff renderer.
 * Renders git diffs with line numbers, green/red gutter,
 * and context lines.
 */

import { bold, cyan, dim, green, red } from "./terminal.js";

export interface DiffRenderOptions {
  /** Maximum number of lines to display. Default: unlimited. */
  maxLines?: number;
  /** Show line numbers in gutter. Default: true. */
  lineNumbers?: boolean;
  /** Number of context lines around changes. Default: 3. */
  context?: number;
}

/**
 * Render a unified diff string with ANSI colors.
 * Returns an array of formatted lines.
 */
export function renderDiff(
  diff: string,
  options: DiffRenderOptions = {}
): string[] {
  const { maxLines, lineNumbers = true } = options;
  const lines = diff.split("\n");
  const output: string[] = [];
  let lineCount = 0;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (maxLines && lineCount >= maxLines) {
      const remaining = lines.length - lineCount;
      if (remaining > 0) {
        output.push(dim(`  ... +${remaining} more lines`));
      }
      break;
    }

    if (line.startsWith("diff --git")) {
      // File header
      const filePath = extractFilePath(line);
      output.push("");
      output.push(bold(cyan(`── ${filePath} ──`)));
      lineCount += 2;
      continue;
    }

    if (
      line.startsWith("index ") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      // Skip these meta lines
      continue;
    }

    if (line.startsWith("@@")) {
      // Hunk header — extract line numbers
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      if (match) {
        oldLine = Number.parseInt(match[1], 10);
        newLine = Number.parseInt(match[2], 10);
        const context = match[3] ?? "";
        output.push(
          dim(`  ${line.slice(0, 60)}${context ? ` ${context.trim()}` : ""}`)
        );
        lineCount++;
      }
      continue;
    }

    if (line.startsWith("+")) {
      // Addition
      const gutter = lineNumbers ? `${dim(padNum(newLine))} ` : "";
      output.push(`${gutter}${green("+")} ${green(line.slice(1))}`);
      newLine++;
      lineCount++;
      continue;
    }

    if (line.startsWith("-")) {
      // Deletion
      const gutter = lineNumbers ? `${dim(padNum(oldLine))} ` : "";
      output.push(`${gutter}${red("-")} ${red(line.slice(1))}`);
      oldLine++;
      lineCount++;
      continue;
    }

    if (line.startsWith(" ")) {
      // Context line
      const gutter = lineNumbers ? `${dim(padNum(newLine))} ` : "";
      output.push(`${gutter}${dim("|")} ${dim(line.slice(1))}`);
      oldLine++;
      newLine++;
      lineCount++;
      continue;
    }

    // Other lines (e.g., "No newline at end of file")
    if (line.trim()) {
      output.push(dim(`  ${line}`));
      lineCount++;
    }
  }

  return output;
}

/**
 * Render a compact inline diff (for tool cards).
 * Shows only additions and deletions, max N lines.
 */
export function renderCompactDiff(
  diff: string,
  maxLines: number = 10
): string[] {
  const lines = diff.split("\n");
  const output: string[] = [];
  let count = 0;
  let totalChanges = 0;

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      totalChanges++;
      if (count < maxLines) {
        output.push(green(`+ ${line.slice(1)}`));
        count++;
      }
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      totalChanges++;
      if (count < maxLines) {
        output.push(red(`- ${line.slice(1)}`));
        count++;
      }
    }
  }

  if (totalChanges > maxLines) {
    output.push(dim(`  ... +${totalChanges - maxLines} more changes`));
  }

  return output;
}

/**
 * Count additions and deletions in a diff.
 */
export function countDiffChanges(diff: string): {
  additions: number;
  deletions: number;
  files: number;
} {
  const lines = diff.split("\n");
  let additions = 0;
  let deletions = 0;
  let files = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) files++;
    else if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  return { additions, deletions, files };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractFilePath(diffLine: string): string {
  // "diff --git a/path/to/file b/path/to/file"
  const match = diffLine.match(/diff --git a\/(.+) b\//);
  return match?.[1] ?? diffLine;
}

function padNum(n: number): string {
  return String(n).padStart(4);
}
