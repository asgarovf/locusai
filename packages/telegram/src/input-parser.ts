/**
 * Input parsing utilities for Telegram bot commands.
 * Handles Unicode normalization (smart quotes, em dashes) and
 * shell-style argument parsing with quoted string support.
 */

/**
 * Normalize Unicode dashes/quotes to their ASCII equivalents.
 * Telegram (and many mobile keyboards) auto-replace:
 *   -- → — (em dash U+2014)
 *   -  → – (en dash U+2013)
 *   "  → "" (smart quotes U+201C/U+201D)
 *   '  → '' (smart quotes U+2018/U+2019)
 */
export function normalizeInput(input: string): string {
  return input
    .replace(/\u2014/g, "--") // em dash → two hyphens
    .replace(/\u2013/g, "-") // en dash → hyphen
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB\uFF02]/g, '"') // all Unicode double quotes → straight
    .replace(/[\u2018\u2019\u201A\u201B\u2039\u203A\uFF07]/g, "'"); // all Unicode single quotes → straight
}

/**
 * Parse a command string into arguments, respecting quoted strings.
 * Handles both single and double quotes.
 * Normalizes Unicode dashes/quotes from mobile keyboards and Telegram.
 */
export function parseArgs(input: string): string[] {
  const normalized = normalizeInput(input);
  const args: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}
