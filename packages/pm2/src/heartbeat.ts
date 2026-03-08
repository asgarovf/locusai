/**
 * Heartbeat utility for PM2 worker processes.
 *
 * Logs health status at a configurable interval (default: 5 minutes)
 * so operators can verify workers are alive and responsive.
 */

export interface HeartbeatLogger {
  info(message: string, meta?: Record<string, unknown>): void;
}

export interface HeartbeatOptions {
  /** Process name for identification. */
  processName: string;
  /** Logger instance (must have .info()). */
  logger: HeartbeatLogger;
  /** Interval in milliseconds. Default: 5 minutes. */
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startHeartbeat(options: HeartbeatOptions): () => void {
  const { processName, logger, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const startedAt = Date.now();

  const tick = () => {
    const uptimeSec = Math.floor((Date.now() - startedAt) / 1000);
    const memUsage = process.memoryUsage();
    const heapMB = (memUsage.heapUsed / (1024 * 1024)).toFixed(1);
    const rssMB = (memUsage.rss / (1024 * 1024)).toFixed(1);

    logger.info(
      `[heartbeat] ${processName} alive — uptime: ${formatUptime(uptimeSec)}, heap: ${heapMB}MB, rss: ${rssMB}MB`
    );
  };

  // First heartbeat immediately
  tick();

  const timer = setInterval(tick, intervalMs);
  // Allow the process to exit even if the timer is still active
  timer.unref();

  return () => clearInterval(timer);
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
