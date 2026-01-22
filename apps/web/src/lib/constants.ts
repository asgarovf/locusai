/**
 * Application Constants
 *
 * Centralized configuration and constants.
 */

/**
 * Loading timeouts and delays
 */
export const TIMING = {
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 500,
  ANIMATION_DURATION_MS: 300,
  TOAST_DURATION_MS: 3000,
  LONG_TOAST_DURATION_MS: 5000,
  SKELETON_LOAD_TIME_MS: 2000,
} as const;

/**
 * Z-index layers for proper stacking
 */
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 100,
  STICKY: 500,
  FIXED: 900,
  MODAL_OVERLAY: 940,
  MODAL: 950,
  TOOLTIP: 1000,
  NOTIFICATION: 1100,
} as const;

/**
 * Keyboard shortcuts
 */
export const SHORTCUTS = {
  CREATE_TASK: "Alt+N",
  CREATE_SPRINT: "Alt+S",
  CLOSE_MODAL: "Escape",
  SAVE: "Cmd+S",
  SEARCH: "Cmd+K",
} as const;

/**
 * API rate limiting
 */
export const RATE_LIMITS = {
  CREATE_SPRINT_MS: 1000,
  CREATE_TASK_MS: 500,
  UPDATE_TASK_MS: 500,
  DELETE_TASK_MS: 500,
} as const;

/**
 * Pagination and limits
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 100,
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 255,
  MIN_DESC_LENGTH: 0,
  MAX_DESC_LENGTH: 10000,
  MAX_COMMENT_LENGTH: 5000,
} as const;
