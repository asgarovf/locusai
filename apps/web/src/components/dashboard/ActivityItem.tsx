/**
 * Activity Item Component
 *
 * Displays a single activity event from the workspace.
 * Shows event type, details, and relative timestamp.
 */

"use client";

import {
  type EventPayload,
  type Event as WorkspaceEvent,
} from "@locusai/shared";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Rocket,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ActivityItemProps {
  /** Workspace event to display */
  event: WorkspaceEvent;
}

const formatStatus = (status: string) => {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function ActivityItem({ event }: ActivityItemProps) {
  const { user } = useAuth();
  const { type, payload } = event;

  const getEventConfig = () => {
    switch (type) {
      case "TASK_CREATED": {
        const p = payload as Extract<
          EventPayload,
          { type: "TASK_CREATED" }
        >["payload"];
        return {
          icon: Plus,
          color: "text-emerald-500",
          action: "created task",
          target: p.title,
        };
      }
      case "STATUS_CHANGED": {
        const p = payload as Extract<
          EventPayload,
          { type: "STATUS_CHANGED" }
        >["payload"];
        return {
          icon: Activity,
          color: "text-primary",
          action: `moved task to ${formatStatus(p.newStatus)}`,
          target: p.title,
        };
      }
      case "COMMENT_ADDED": {
        const p = payload as Extract<
          EventPayload,
          { type: "COMMENT_ADDED" }
        >["payload"];
        return {
          icon: MessageSquare,
          color: "text-blue-500",
          action: "commented on",
          target: p.title,
        };
      }
      case "WORKSPACE_CREATED": {
        const p = payload as Extract<
          EventPayload,
          { type: "WORKSPACE_CREATED" }
        >["payload"];
        return {
          icon: Rocket,
          color: "text-purple-500",
          action: "created the workspace",
          target: p.name,
        };
      }
      case "MEMBER_INVITED": {
        const p = payload as Extract<
          EventPayload,
          { type: "MEMBER_INVITED" }
        >["payload"];
        return {
          icon: UserPlus,
          color: "text-amber-500",
          action: `invited ${p.email} to the team`,
          target: "",
        };
      }
      case "SPRINT_CREATED": {
        const p = payload as Extract<
          EventPayload,
          { type: "SPRINT_CREATED" }
        >["payload"];
        return {
          icon: Clock,
          color: "text-primary",
          action: "created sprint",
          target: p.name,
        };
      }
      case "SPRINT_STATUS_CHANGED": {
        const p = payload as Extract<
          EventPayload,
          { type: "SPRINT_STATUS_CHANGED" }
        >["payload"];
        return {
          icon: Rocket,
          color: "text-orange-500",
          action: `moved sprint to ${formatStatus(p.newStatus)}`,
          target: p.name,
        };
      }
      case "TASK_DELETED": {
        const p = payload as Extract<
          EventPayload,
          { type: "TASK_DELETED" }
        >["payload"];
        return {
          icon: Activity,
          color: "text-red-500",
          action: "deleted task",
          target: p.title,
        };
      }
      case "CI_RAN": {
        const p = payload as Extract<
          EventPayload,
          { type: "CI_RAN" }
        >["payload"];
        return {
          icon: ShieldCheck,
          color: p.ok ? "text-emerald-500" : "text-rose-500",
          action: `ran verification: ${p.ok ? "Passed" : "Failed"}`,
          target: p.preset,
        };
      }
      case "CHECKLIST_INITIALIZED": {
        const p = payload as Extract<
          EventPayload,
          { type: "CHECKLIST_INITIALIZED" }
        >["payload"];
        return {
          icon: CheckCircle2,
          color: "text-blue-500",
          action: `initialized ${p.itemCount} checklist items`,
          target: "",
        };
      }
      default:
        return {
          icon: Activity,
          color: "text-muted-foreground",
          action: type.toLowerCase().replace(/_/g, " "),
          target: "",
        };
    }
  };

  const config = getEventConfig();
  const Icon = config.icon;

  const parseDate = (date: string | number | Date | null | undefined) => {
    if (!date) return new Date();
    return new Date(date);
  };

  const eventDate = parseDate(event.createdAt);

  return (
    <div className="flex items-start gap-4 p-3 hover:bg-secondary/20 rounded-xl transition-colors group">
      <div className={`p-2 rounded-lg bg-secondary/50 ${config.color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-foreground/90">
            {event.userId === user?.id ? "You" : "Team member"}
          </span>{" "}
          <span className="text-muted-foreground">{config.action}</span>{" "}
          {config.target && (
            <span className="font-medium text-primary">"{config.target}"</span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(eventDate, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
