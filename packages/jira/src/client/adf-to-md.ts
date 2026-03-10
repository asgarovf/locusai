/**
 * ADF-to-Markdown converter for @locusai/locus-jira.
 *
 * Transforms Jira Cloud's Atlassian Document Format (ADF) JSON trees
 * into clean Markdown suitable for AI agent consumption.
 */

import type { ADFMark, ADFNode } from "./types.js";

/**
 * Convert an ADF document tree to Markdown.
 * Returns an empty string for null/undefined input.
 */
export function adfToMarkdown(adf: ADFNode | null | undefined): string {
  if (!adf) return "";
  const raw = convertNode(adf, { depth: 0, ordered: false, indent: 0 });
  return cleanOutput(raw);
}

interface Context {
  depth: number;
  ordered: boolean;
  indent: number;
}

// ─── Node Dispatch ──────────────────────────────────────────────────────────

function convertNode(node: ADFNode, ctx: Context): string {
  switch (node.type) {
    case "doc":
      return convertChildren(node, ctx);
    case "paragraph":
      return convertParagraph(node, ctx);
    case "heading":
      return convertHeading(node, ctx);
    case "bulletList":
      return convertList(node, { ...ctx, ordered: false });
    case "orderedList":
      return convertList(node, { ...ctx, ordered: true });
    case "listItem":
      return convertListItem(node, ctx);
    case "codeBlock":
      return convertCodeBlock(node);
    case "blockquote":
      return convertBlockquote(node, ctx);
    case "rule":
      return "---\n\n";
    case "table":
      return convertTable(node, ctx);
    case "panel":
      return convertPanel(node, ctx);
    case "mediaSingle":
    case "mediaGroup":
      return convertChildren(node, ctx);
    case "media":
      return convertMedia(node);
    case "text":
      return applyMarks(node.text ?? "", node.marks);
    case "inlineCard":
      return convertInlineCard(node);
    case "mention":
      return `@${(node.attrs?.text as string) ?? "unknown"}`;
    case "emoji":
      return convertEmoji(node);
    case "hardBreak":
      return "\n";
    default:
      // Unknown node: try to process children, or return empty
      return node.content ? convertChildren(node, ctx) : "";
  }
}

// ─── Block Nodes ────────────────────────────────────────────────────────────

function convertParagraph(node: ADFNode, ctx: Context): string {
  const text = convertChildren(node, ctx);
  return `${text}\n\n`;
}

function convertHeading(node: ADFNode, ctx: Context): string {
  const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
  const text = convertChildren(node, ctx);
  return `${"#".repeat(level)} ${text}\n\n`;
}

function convertList(node: ADFNode, ctx: Context): string {
  if (!node.content) return "";
  const items = node.content
    .map((child, i) =>
      convertNode(child, {
        ...ctx,
        ordered: ctx.ordered,
        depth: i,
      })
    )
    .join("");
  // Only add trailing newline if not nested
  return ctx.indent === 0 ? `${items}\n` : items;
}

function convertListItem(node: ADFNode, ctx: Context): string {
  const prefix = ctx.ordered ? `${ctx.depth + 1}. ` : "- ";
  const indentStr = "  ".repeat(ctx.indent);

  if (!node.content) return `${indentStr}${prefix}\n`;

  const parts: string[] = [];
  for (const child of node.content) {
    if (child.type === "paragraph") {
      parts.push(convertChildren(child, ctx));
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      // Nested list — increase indent
      const nested = child.content
        ?.map((nestedItem, i) =>
          convertNode(nestedItem, {
            ...ctx,
            ordered: child.type === "orderedList",
            depth: i,
            indent: ctx.indent + 1,
          })
        )
        .join("");
      if (nested) parts.push(`\n${nested}`);
    } else {
      parts.push(convertNode(child, ctx));
    }
  }

  const firstLine = parts[0] ?? "";
  const rest = parts.slice(1).join("");
  return `${indentStr}${prefix}${firstLine}${rest}\n`;
}

function convertCodeBlock(node: ADFNode): string {
  const lang = (node.attrs?.language as string) ?? "";
  const code = node.content?.map((c) => c.text ?? "").join("") ?? "";
  return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
}

function convertBlockquote(node: ADFNode, ctx: Context): string {
  const inner = convertChildren(node, ctx).trimEnd();
  const quoted = inner
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `${quoted}\n\n`;
}

function convertTable(node: ADFNode, ctx: Context): string {
  if (!node.content) return "";

  const rows: string[][] = [];
  const headerRowIndexes: number[] = [];

  for (const row of node.content) {
    if (row.type !== "tableRow") continue;
    const cells: string[] = [];
    let isHeaderRow = false;

    for (const cell of row.content ?? []) {
      if (cell.type === "tableHeader") isHeaderRow = true;
      const text = convertChildren(cell, ctx).trim().replace(/\n/g, " ");
      cells.push(text);
    }

    if (isHeaderRow) headerRowIndexes.push(rows.length);
    rows.push(cells);
  }

  if (rows.length === 0) return "";

  const colCount = Math.max(...rows.map((r) => r.length));
  const lines: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const padded = rows[i];
    while (padded.length < colCount) padded.push("");
    lines.push(`| ${padded.join(" | ")} |`);

    // Add separator after header rows
    if (headerRowIndexes.includes(i)) {
      lines.push(`| ${Array(colCount).fill("---").join(" | ")} |`);
    }
  }

  // If no header row was found, add separator after first row
  if (headerRowIndexes.length === 0 && rows.length > 0) {
    lines.splice(1, 0, `| ${Array(colCount).fill("---").join(" | ")} |`);
  }

  return `${lines.join("\n")}\n\n`;
}

function convertPanel(node: ADFNode, ctx: Context): string {
  const panelType = (node.attrs?.panelType as string) ?? "info";
  const label = panelType.charAt(0).toUpperCase() + panelType.slice(1);
  const inner = convertChildren(node, ctx).trim();
  const quoted = inner
    .split("\n")
    .map((line, i) => (i === 0 ? `> **${label}:** ${line}` : `> ${line}`))
    .join("\n");
  return `${quoted}\n\n`;
}

function convertMedia(node: ADFNode): string {
  const url = node.attrs?.url as string | undefined;
  if (url) return `[media](${url})`;
  return "[media]";
}

// ─── Inline Nodes ───────────────────────────────────────────────────────────

function convertInlineCard(node: ADFNode): string {
  const url = (node.attrs?.url as string) ?? "";
  const title = (node.attrs?.title as string) || url;
  return url ? `[${title}](${url})` : title;
}

function convertEmoji(node: ADFNode): string {
  const text = node.attrs?.text as string | undefined;
  if (text) return text;
  const shortName = node.attrs?.shortName as string | undefined;
  return shortName ?? "";
}

// ─── Marks ──────────────────────────────────────────────────────────────────

function applyMarks(text: string, marks?: ADFMark[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "strong":
        result = `**${result}**`;
        break;
      case "em":
        result = `*${result}*`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
      case "strike":
        result = `~~${result}~~`;
        break;
      case "link": {
        const href = (mark.attrs?.href as string) ?? "";
        result = `[${result}](${href})`;
        break;
      }
      case "underline":
        // No Markdown equivalent — pass through as plain text
        break;
    }
  }
  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function convertChildren(node: ADFNode, ctx: Context): string {
  if (!node.content) return "";
  return node.content.map((child) => convertNode(child, ctx)).join("");
}

function cleanOutput(text: string): string {
  return (
    text
      // Collapse 3+ newlines into 2
      .replace(/\n{3,}/g, "\n\n")
      // Remove trailing whitespace on each line
      .replace(/[ \t]+$/gm, "")
      .trim()
  );
}
