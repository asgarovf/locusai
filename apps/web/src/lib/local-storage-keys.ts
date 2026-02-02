/**
 * Centralized localStorage keys registry
 * All keys are prefixed with 'locus_' to differentiate them in the browser
 */
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: "locus_token",

  // UI State
  SIDEBAR_COLLAPSED: "locus_sidebar_collapsed",
  TASK_SIDEBAR_OPEN: "locus_task_sidebar_open",
  EXPAND_COMPLETED_SPRINTS: "locus_expand_completed_sprints",

  // User Onboarding Tours
  TOUR_DASHBOARD_SEEN: "locus_tour_dashboard_seen",
  TOUR_BOARD_SEEN: "locus_tour_board_seen",
  TOUR_CHAT_SEEN: "locus_tour_chat_seen",
  TOUR_BACKLOG_SEEN: "locus_tour_backlog_seen",
  TOUR_INTERVIEW_SEEN: "locus_tour_interview_seen",

  // Interview Onboarding
  INTERVIEW_AUTOSTART_DONE: "locus_interview_autostart_done",

  // Workspace
  LAST_WORKSPACE_ID: "locus_last_workspace_id",

  // Chat Sessions (dynamic key - use getChatSessionKey function)
  CHAT_SESSION_PREFIX: "locus_chat_session_",

  // Interview Chat Backup (dynamic key - use getInterviewBackupKey function)
  INTERVIEW_CHAT_BACKUP_PREFIX: "locus_interview_chat_backup_",
} as const;

/**
 * Get the storage key for a specific chat session
 */
export function getChatSessionKey(workspaceId: string): string {
  return `${STORAGE_KEYS.CHAT_SESSION_PREFIX}${workspaceId}`;
}

/**
 * Get the storage key for interview chat backup
 */
export function getInterviewBackupKey(workspaceId: string): string {
  return `${STORAGE_KEYS.INTERVIEW_CHAT_BACKUP_PREFIX}${workspaceId}`;
}

/**
 * Migration mapping from old keys to new keys
 */
export const STORAGE_KEY_MIGRATIONS: Record<string, string> = {
  "sidebar-collapsed": STORAGE_KEYS.SIDEBAR_COLLAPSED,
  "task-sidebar-open": STORAGE_KEYS.TASK_SIDEBAR_OPEN,
  expandCompletedSprints: STORAGE_KEYS.EXPAND_COMPLETED_SPRINTS,
  hasSeenDashboardTour: STORAGE_KEYS.TOUR_DASHBOARD_SEEN,
  hasSeenBoardTour: STORAGE_KEYS.TOUR_BOARD_SEEN,
  hasSeenChatTour: STORAGE_KEYS.TOUR_CHAT_SEEN,
  hasSeenBacklogTour: STORAGE_KEYS.TOUR_BACKLOG_SEEN,
  hasSeenInterviewTour: STORAGE_KEYS.TOUR_INTERVIEW_SEEN,
  lastWorkspaceId: STORAGE_KEYS.LAST_WORKSPACE_ID,
  "locus-active-chat-session": STORAGE_KEYS.CHAT_SESSION_PREFIX, // Prefix migration
};
