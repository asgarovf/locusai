/**
 * Badge component props
 *
 * @property variant - Badge color variant
 * @property size - Badge size (default: "sm")
 */
interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Badge color variant */
  variant?:
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "purple"
    | "primary"
    | "secondary"
    | "outline";
  /** Badge size */
  size?: "sm" | "md";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge component
 *
 * A small component used to display status, labels, or tags.
 * Supports multiple variants and sizes.
 *
 * @example
 * // Basic badge
 * <Badge>New</Badge>
 *
 * @example
 * // Success badge
 * <Badge variant="success">Active</Badge>
 */
export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/80",
    primary: "bg-primary/15 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "text-foreground border-border",
    success: "bg-status-done/15 text-status-done border-status-done/20",
    warning:
      "bg-status-progress/15 text-status-progress border-status-progress/20",
    error: "bg-status-blocked/15 text-status-blocked border-status-blocked/20",
    info: "bg-status-todo/15 text-status-todo border-status-todo/20",
    purple: "bg-status-review/15 text-status-review border-status-review/20",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs font-semibold",
    md: "px-3 py-1 text-sm font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Priority badge component props
 *
 * @property priority - Task priority level
 */
interface PriorityBadgeProps {
  /** Task priority level */
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", variant: "default" as const },
  MEDIUM: { label: "Medium", variant: "info" as const },
  HIGH: { label: "High", variant: "warning" as const },
  CRITICAL: { label: "Critical", variant: "error" as const },
};

/**
 * Priority badge component
 *
 * Displays task priority with appropriate color coding.
 *
 * @example
 * <PriorityBadge priority="HIGH" />
 */
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * Status badge component props
 *
 * @property status - Task status
 */
interface StatusBadgeProps {
  /** Task status value */
  status: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "success" | "warning" | "error" | "info" | "purple";
  }
> = {
  BACKLOG: { label: "Backlog", variant: "default" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  REVIEW: { label: "Review", variant: "purple" },
  VERIFICATION: { label: "Verification", variant: "info" },
  DONE: { label: "Done", variant: "success" },
  BLOCKED: { label: "Blocked", variant: "error" },
};

/**
 * Status badge component
 *
 * Displays task status with appropriate color coding.
 * Automatically maps status values to display labels and colors.
 *
 * @example
 * <StatusBadge status="IN_PROGRESS" />
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "default" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
