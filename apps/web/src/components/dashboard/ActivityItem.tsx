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
  Clock,
  MessageSquare,
  Plus,
  Rocket,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ActivityItemProps {
  /** Workspace event to display */
  event: WorkspaceEvent;
}

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
          action: `moved task to ${p.newStatus}`,
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
          action: "commented on task",
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
          action: `invited ${p.email}`,
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
          action: `moved sprint to ${p.newStatus}`,
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
      default:
        return {
          icon: Activity,
          color: "text-muted-foreground",
          action: type,
          target: "",
        };
    }
  };

  const config = getEventConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-3 hover:bg-secondary/20 rounded-xl transition-colors group">
      <div className={`p-2 rounded-lg bg-secondary/50 ${config.color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-foreground/90">
            {event.userId === user?.id ? "You" : "Team member"}
          </span>{" "}
          <span className="text-muted-foreground">{config.action}</span>{" "}
          {config.target && (
            <span className="font-medium text-primary cursor-pointer hover:underline">
              {config.target}
            </span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
