/**
 * SVG icon strings for inline use. All icons are 16x16 viewBox.
 */

const S = 16; // standard viewBox size

function wrap(inner: string, size = S): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export const icons = {
  user: wrap(
    `<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-4.5 6a4.5 4.5 0 0 1 9 0h-9Z" fill="currentColor"/>`
  ),
  locus: wrap(
    `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M5 8.5l2 2 4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  send: wrap(
    `<path d="M14.5 1.5L6.5 9.5M14.5 1.5L10 14.5L6.5 9.5M14.5 1.5L1.5 6L6.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  stop: wrap(
    `<rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor"/>`
  ),
  spinner: wrap(
    `<path d="M8 2a6 6 0 1 0 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/></path>`
  ),
  check: wrap(
    `<path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  x: wrap(
    `<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`
  ),
  alert: wrap(
    `<path d="M8 1.5L1 14h14L8 1.5z" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="8" y1="6" x2="8" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="12" r="0.8" fill="currentColor"/>`
  ),
  info: wrap(
    `<circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2" fill="none"/><line x1="8" y1="7" x2="8" y2="11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="5" r="0.8" fill="currentColor"/>`
  ),
  session: wrap(
    `<rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M5 7h6M5 9.5h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`
  ),
  chevronDown: wrap(
    `<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  chevronRight: wrap(
    `<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  arrowDown: wrap(
    `<path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  plus: wrap(
    `<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`
  ),
  refresh: wrap(
    `<path d="M2.5 8a5.5 5.5 0 0 1 9.9-3.2M13.5 8a5.5 5.5 0 0 1-9.9 3.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 2v3h-3M4 14v-3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  resume: wrap(`<path d="M4 3l9 5-9 5V3z" fill="currentColor"/>`),
  // Tool icons
  toolRead: wrap(
    `<path d="M3 2h7l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M5 7h6M5 9.5h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`
  ),
  toolWrite: wrap(
    `<path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.2" fill="none"/>`
  ),
  toolEdit: wrap(
    `<path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M9 4l3 3" stroke="currentColor" stroke-width="1.2"/>`
  ),
  toolBash: wrap(
    `<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M4.5 6.5l2.5 2-2.5 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 10.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`
  ),
  toolGrep: wrap(
    `<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`
  ),
  toolGlob: wrap(
    `<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5 7h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`
  ),
  toolWebFetch: wrap(
    `<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M2.5 8h11M8 2.5c-2 2.5-2 8.5 0 11M8 2.5c2 2.5 2 8.5 0 11" stroke="currentColor" stroke-width="1" fill="none"/>`
  ),
} as const;

const toolIconMap: Record<string, string> = {
  Read: icons.toolRead,
  Write: icons.toolWrite,
  Edit: icons.toolEdit,
  Bash: icons.toolBash,
  Grep: icons.toolGrep,
  Glob: icons.toolGlob,
  WebFetch: icons.toolWebFetch,
};

export function getToolIcon(toolName: string): string {
  return toolIconMap[toolName] || icons.session;
}

const toolColorMap: Record<string, string> = {
  Read: "#38bdf8",
  Write: "#10b981",
  Edit: "#f59e0b",
  Bash: "#a1a1aa",
  Grep: "#8b5cf6",
  Glob: "#8b5cf6",
  WebFetch: "#22d3ee",
};

export function getToolColor(toolName: string): string {
  return toolColorMap[toolName] || "#a1a1aa";
}
