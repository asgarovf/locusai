/**
 * Centralized timeout configuration for all Telegram bot commands and processes.
 * All values are in milliseconds.
 */

/** Telegraf handler timeout — must exceed the longest command timeout. */
export const HANDLER_TIMEOUT = 3_600_000; // 1 hour

/** Default timeout for `execute()` — used by most commands (plans, exec, status, etc.). */
export const EXECUTE_DEFAULT_TIMEOUT = 3_600_000; // 1 hour

/** Timeout for the /plan command (3 sequential LLM phases). */
export const PLAN_TIMEOUT = 3_600_000; // 1 hour

/** Default timeout for `executeStreaming()` — used by long-running commands like /run. */
export const STREAMING_DEFAULT_TIMEOUT = 3_600_000; // 1 hour

/** Timeout for /git commands. */
export const GIT_TIMEOUT = 60_000; // 1 minute

/** Timeout for /dev commands (lint, typecheck, build, test). */
export const DEV_TIMEOUT = 600_000; // 10 minutes

/** Timeout for /upgrade command (npm install can be slow). */
export const UPGRADE_TIMEOUT = 300_000; // 5 minutes
