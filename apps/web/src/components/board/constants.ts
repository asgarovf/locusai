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
    key: TaskStatus.PR_OPEN,
    label: "PR Open",
    colorVar: "var(--color-status-pr-open)",
    className: "bg-[var(--color-status-pr-open)]",
  },
  {
    key: TaskStatus.IN_REVIEW,
    label: "In Review",
    colorVar: "var(--color-status-in-review)",
    className: "bg-[var(--color-status-in-review)]",
  },
  {
    key: TaskStatus.BLOCKED,
    label: "Blocked",
    colorVar: "var(--color-status-blocked)",
    className: "bg-[var(--color-status-blocked)]",
  },
  {
    key: TaskStatus.DONE,
    label: "Done",
    colorVar: "var(--color-status-done)",
    className: "bg-[var(--color-status-done)]",
  },
];
