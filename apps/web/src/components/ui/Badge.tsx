interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  size?: "sm" | "md";
}

const VARIANT_STYLES = {
  default: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "var(--text-muted)",
  },
  success: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
  },
  warning: {
    background: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
  },
  error: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
  },
  info: {
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
  },
  purple: {
    background: "rgba(168, 85, 247, 0.15)",
    color: "#a855f7",
  },
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
}: BadgeProps) {
  const styles = VARIANT_STYLES[variant];
  const padding = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize = size === "sm" ? "0.625rem" : "0.75rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding,
        borderRadius: "4px",
        fontSize,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.025em",
        ...styles,
      }}
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
