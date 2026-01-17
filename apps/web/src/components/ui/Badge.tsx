interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
}: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/80",
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
      className={`inline-flex items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const PRIORITY_CONFIG = {
  LOW: { label: "Low", variant: "default" as const },
  MEDIUM: { label: "Medium", variant: "info" as const },
  HIGH: { label: "High", variant: "warning" as const },
  CRITICAL: { label: "Critical", variant: "error" as const },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface StatusBadgeProps {
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

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "default" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
