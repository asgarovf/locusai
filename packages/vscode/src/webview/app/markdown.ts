/**
 * Lightweight markdown-to-HTML renderer.
 * Handles: code blocks, inline code, bold, italic, links, line breaks.
 * No external dependencies.
 */

/**
 * Escape HTML entities to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Process inline markdown: bold, italic, inline code, links.
 */
function processInline(text: string): string {
  let result = escapeHtml(text);
  // Inline code (must come before bold/italic to avoid conflicts)
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="lc-code-inline">$1</code>'
  );
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a class="lc-link" href="$2" title="$1">$1</a>'
  );
  return result;
}

/**
 * Render markdown string to HTML.
 * Supports fenced code blocks, inline code, bold, italic, links.
 */
export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (const line of lines) {
    if (!inCode && line.startsWith("```")) {
      inCode = true;
      codeLang = line.slice(3).trim();
      codeLines = [];
      continue;
    }

    if (inCode) {
      if (line.startsWith("```")) {
        const langAttr = codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : "";
        const langLabel = codeLang
          ? `<span class="lc-code-lang">${escapeHtml(codeLang)}</span>`
          : "";
        out.push(
          `<div class="lc-code-block"${langAttr}>${langLabel}<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre></div>`
        );
        inCode = false;
        codeLang = "";
        codeLines = [];
      } else {
        codeLines.push(line);
      }
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      out.push("<br/>");
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      out.push(
        `<h${level} class="lc-heading">${processInline(headingMatch[2])}</h${level}>`
      );
      continue;
    }

    // Bullet list items
    if (line.match(/^[-*]\s+/)) {
      out.push(
        `<div class="lc-list-item">${processInline(line.replace(/^[-*]\s+/, ""))}</div>`
      );
      continue;
    }

    // Numbered list items
    if (line.match(/^\d+\.\s+/)) {
      out.push(
        `<div class="lc-list-item">${processInline(line.replace(/^\d+\.\s+/, ""))}</div>`
      );
      continue;
    }

    out.push(`<p class="lc-paragraph">${processInline(line)}</p>`);
  }

  // Handle unclosed code fence (streaming)
  if (inCode && codeLines.length > 0) {
    const langAttr = codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : "";
    const langLabel = codeLang
      ? `<span class="lc-code-lang">${escapeHtml(codeLang)}</span>`
      : "";
    out.push(
      `<div class="lc-code-block lc-code-streaming"${langAttr}>${langLabel}<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre></div>`
    );
  }

  return out.join("");
}
