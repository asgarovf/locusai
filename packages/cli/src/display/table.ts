/**
 * Table rendering for terminal output.
 * ANSI-aware column widths, alignment, and truncation.
 */

import {
  bold,
  dim,
  getCapabilities,
  gray,
  padEnd,
  stripAnsi,
} from "./terminal.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Column {
  key: string;
  header: string;
  /** Min column width (default: header length). */
  minWidth?: number;
  /** Max column width (0 = unlimited, default: 0). */
  maxWidth?: number;
  /** Alignment (default: "left"). */
  align?: "left" | "right" | "center";
  /** Custom formatter for cell values. */
  format?: (value: unknown, row: Record<string, unknown>) => string;
}

export interface TableOptions {
  /** Indent each row by N spaces (default: 2). */
  indent?: number;
  /** Show separator line between header and rows (default: true). */
  headerSeparator?: boolean;
  /** Max rows to show before truncating with "... and N more" (0 = no limit). */
  maxRows?: number;
  /** Message when no rows (default: "No results."). */
  emptyMessage?: string;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

/**
 * Render a table to a string for terminal output.
 *
 * Features:
 * - Auto-sizes columns based on content (up to maxWidth)
 * - ANSI-aware width calculations
 * - Left/right/center alignment
 * - Truncation with ellipsis for oversized cells
 * - Empty state message
 */
export function renderTable(
  columns: Column[],
  rows: Record<string, unknown>[],
  options: TableOptions = {}
): string {
  const {
    indent = 2,
    headerSeparator = true,
    maxRows = 0,
    emptyMessage = "No results.",
  } = options;

  if (rows.length === 0) {
    return `${" ".repeat(indent)}${dim(emptyMessage)}`;
  }

  const termWidth = getCapabilities().columns;
  const indentStr = " ".repeat(indent);
  const gap = 2; // space between columns

  // Format all cell values
  const formattedRows = rows.map((row) => {
    const formatted: Record<string, string> = {};
    for (const col of columns) {
      if (col.format) {
        formatted[col.key] = col.format(row[col.key], row);
      } else {
        const val = row[col.key];
        formatted[col.key] =
          val === null || val === undefined ? "" : String(val);
      }
    }
    return formatted;
  });

  // Calculate column widths
  const colWidths: number[] = columns.map((col, _i) => {
    const headerWidth = stripAnsi(col.header).length;
    const minWidth = col.minWidth ?? headerWidth;

    let maxContent = headerWidth;
    for (const row of formattedRows) {
      const cellWidth = stripAnsi(row[col.key] ?? "").length;
      if (cellWidth > maxContent) maxContent = cellWidth;
    }

    let width = Math.max(minWidth, maxContent);
    if (col.maxWidth && col.maxWidth > 0) {
      width = Math.min(width, col.maxWidth);
    }

    return width;
  });

  // Shrink columns if total width exceeds terminal
  const totalWidth =
    indent + colWidths.reduce((s, w) => s + w, 0) + gap * (columns.length - 1);
  if (totalWidth > termWidth && columns.length > 1) {
    const overflow = totalWidth - termWidth;
    // Shrink the widest column that has maxWidth=0 (flexible)
    let widestIdx = 0;
    let widestSize = 0;
    for (let i = 0; i < columns.length; i++) {
      if (!columns[i].maxWidth && colWidths[i] > widestSize) {
        widestSize = colWidths[i];
        widestIdx = i;
      }
    }
    colWidths[widestIdx] = Math.max(10, colWidths[widestIdx] - overflow);
  }

  // Render header
  const lines: string[] = [];
  const headerParts = columns.map((col, i) =>
    alignCell(bold(col.header), colWidths[i], col.align ?? "left")
  );
  lines.push(`${indentStr}${headerParts.join(" ".repeat(gap))}`);

  // Separator
  if (headerSeparator) {
    const sep = columns
      .map((_, i) => gray("─".repeat(colWidths[i])))
      .join(" ".repeat(gap));
    lines.push(`${indentStr}${sep}`);
  }

  // Render rows
  const displayRows =
    maxRows > 0 ? formattedRows.slice(0, maxRows) : formattedRows;

  for (const row of displayRows) {
    const cellParts = columns.map((col, i) => {
      const raw = row[col.key] ?? "";
      return alignCell(raw, colWidths[i], col.align ?? "left");
    });
    lines.push(`${indentStr}${cellParts.join(" ".repeat(gap))}`);
  }

  // Truncation message
  if (maxRows > 0 && formattedRows.length > maxRows) {
    const remaining = formattedRows.length - maxRows;
    lines.push(`${indentStr}${dim(`... and ${remaining} more`)}`);
  }

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Align a cell value within a column width, ANSI-aware. */
function alignCell(
  text: string,
  width: number,
  align: "left" | "right" | "center"
): string {
  const visual = stripAnsi(text).length;

  // Truncate if needed
  if (visual > width) {
    const stripped = stripAnsi(text);
    return `${stripped.slice(0, width - 1)}…`;
  }

  const padding = width - visual;

  switch (align) {
    case "right":
      return " ".repeat(padding) + text;
    case "center": {
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return " ".repeat(left) + text + " ".repeat(right);
    }
    default:
      return text + " ".repeat(padding);
  }
}

/**
 * Render a simple key-value detail view.
 * Used for `show` commands (issue show, sprint show).
 */
export function renderDetails(
  entries: Array<{ label: string; value: string }>,
  options: { indent?: number; labelWidth?: number } = {}
): string {
  const { indent = 2, labelWidth: fixedWidth } = options;
  const indentStr = " ".repeat(indent);

  const labelWidth =
    fixedWidth ??
    Math.max(...entries.map((e) => stripAnsi(e.label).length)) + 1;

  return entries
    .map((entry) => {
      const label = padEnd(dim(`${entry.label}:`), labelWidth + 1);
      return `${indentStr}${label} ${entry.value}`;
    })
    .join("\n");
}
