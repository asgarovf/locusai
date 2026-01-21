import { TaskStatus } from "@locusai/shared";

export const BOARD_STATUSES = [
  {
    key: TaskStatus.BACKLOG,
    label: "Backlog",
    colorVar: "var(--color-status-backlog)",
    className: "bg-[var(--color-status-backlog)]",
  },
  {
    key: TaskStatus.IN_PROGRESS,
    label: "In Progress",
    colorVar: "var(--color-status-todo)",
    className: "bg-[var(--color-status-todo)]",
  },
  {
    key: TaskStatus.REVIEW,
    label: "Review",
    colorVar: "var(--color-status-review)",
    className: "bg-[var(--color-status-review)]",
  },
  {
    key: TaskStatus.VERIFICATION,
    label: "Verification",
    colorVar: "var(--color-status-verification)",
    className: "bg-[var(--color-status-verification)]",
  },
  {
    key: TaskStatus.DONE,
    label: "Done",
    colorVar: "var(--color-status-done)",
    className: "bg-[var(--color-status-done)]",
  },
  {
    key: TaskStatus.BLOCKED,
    label: "Blocked",
    colorVar: "var(--color-status-blocked)",
    className: "bg-[var(--color-status-blocked)]",
  },
];
