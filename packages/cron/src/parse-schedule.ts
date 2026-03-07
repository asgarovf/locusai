/**
 * Parse human-readable schedule strings into millisecond intervals.
 *
 * Supported formats:
 *   - `30s`  → every 30 seconds
 *   - `5m`   → every 5 minutes
 *   - `1h`   → every 1 hour
 *   - `1d`   → every 1 day
 *
 * Minimum interval: 10 seconds.
 */

const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const MIN_INTERVAL_MS = 10_000; // 10 seconds

/**
 * Parse a schedule string like "30m" or "1h" into milliseconds.
 * Returns null if the format is invalid.
 */
export function parseSchedule(schedule: string): number | null {
  const match = schedule.trim().match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multiplier = UNITS[unit];

  if (!multiplier || value <= 0) return null;

  const ms = value * multiplier;
  if (ms < MIN_INTERVAL_MS) return null;

  return ms;
}

/**
 * Format a millisecond interval back to human-readable form.
 */
export function formatInterval(ms: number): string {
  if (ms >= 86_400_000 && ms % 86_400_000 === 0) {
    return `${ms / 86_400_000}d`;
  }
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) {
    return `${ms / 3_600_000}h`;
  }
  if (ms >= 60_000 && ms % 60_000 === 0) {
    return `${ms / 60_000}m`;
  }
  return `${ms / 1_000}s`;
}
