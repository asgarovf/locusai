/**
 * Format a timestamp for display (e.g., "2:34 PM").
 */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${mm} ${ampm}`;
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

/**
 * Format a duration in ms to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

/**
 * Format elapsed time as a running timer string (mm:ss).
 */
export function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * Create a DOM element with optional classes, attributes, and children.
 */
export function el(
  tag: string,
  opts?: {
    cls?: string | string[];
    attrs?: Record<string, string>;
    text?: string;
    html?: string;
    children?: (Node | null)[];
  }
): HTMLElement {
  const element = document.createElement(tag);
  if (opts?.cls) {
    const classes = Array.isArray(opts.cls) ? opts.cls : [opts.cls];
    element.classList.add(...classes);
  }
  if (opts?.attrs) {
    for (const [key, val] of Object.entries(opts.attrs)) {
      element.setAttribute(key, val);
    }
  }
  if (opts?.text) {
    element.textContent = opts.text;
  }
  if (opts?.html) {
    element.innerHTML = opts.html;
  }
  if (opts?.children) {
    for (const child of opts.children) {
      if (child) element.appendChild(child);
    }
  }
  return element;
}
