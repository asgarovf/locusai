"use client";

import { EventType, type Task, type Event as TaskEvent } from "@locusai/shared";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  Edit,
  MessageSquare,
  PlusSquare,
  Tag,
} from "lucide-react";
import { MetadataText, SectionLabel } from "@/components/typography";
import { Button, EmptyState, Input } from "@/components/ui";

interface TaskActivityProps {
  task: Task;
  isLoading?: boolean;
  newComment: string;
  setNewComment: (val: string) => void;
  handleAddComment: () => void;
}

export function TaskActivity({
  task,
  isLoading = false,
  newComment,
  setNewComment,
  handleAddComment,
}: TaskActivityProps) {
  const getActivityIcon = (event: TaskEvent) => {
    switch (event.type) {
      case EventType.COMMENT_ADDED:
        return <MessageSquare size={14} className="text-blue-500" />;
      case EventType.STATUS_CHANGED:
        return <Tag size={14} className="text-amber-500" />;
      case EventType.TASK_CREATED:
        return <PlusSquare size={14} className="text-emerald-400" />;
      case EventType.TASK_UPDATED:
        return <Edit size={14} className="text-primary" />;
      case EventType.CI_RAN:
        return <CheckCircle size={14} className="text-accent" />;
      default:
        return <MessageSquare size={14} className="text-muted-foreground" />;
    }
  };

  return (
    <div>
      <SectionLabel as="h4" className="mb-6 pb-2 border-b border-border/40">
        Activity
      </SectionLabel>

      <div className="flex gap-3 mb-6 bg-background/30 p-2 rounded-2xl border border-border/40 shadow-inner focus-within:border-primary/30 transition-all">
        <Input
          value={newComment}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            !isLoading && setNewComment(e.target.value)
          }
          disabled={isLoading}
          placeholder="Write a comment..."
          className="h-10 text-xs font-bold bg-transparent border-none focus:ring-0 placeholder:font-black placeholder:uppercase placeholder:text-[9px] placeholder:tracking-[0.2em]"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !isLoading) handleAddComment();
          }}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || isLoading}
          variant="ghost"
          className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all group shrink-0"
        >
          <MessageSquare
            size={16}
            className="group-hover:rotate-12 transition-transform"
          />
        </Button>
      </div>

      <div className="space-y-10 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin">
        {task.activityLog.length > 0 ? (
          task.activityLog.map((event) => (
            <div key={event.id} className="relative flex gap-6 group">
              <div className="absolute left-[19px] top-10 bottom-[-28px] w-px bg-border/40 group-last:hidden" />
              <div className="h-10 w-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center shrink-0 z-10 shadow-sm">
                {getActivityIcon(event)}
              </div>
              <div className="pt-2 min-w-0">
                <p className="text-xs font-bold text-foreground/80 leading-snug mb-2">
                  {formatActivityEvent(event as TaskEvent)}
                </p>
                <MetadataText size="sm">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                  })}
                </MetadataText>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            variant="minimal"
            title="No Activity"
            className="py-12 opacity-30"
          />
        )}
      </div>
    </div>
  );
}

function formatActivityEvent(event: TaskEvent): string {
  const { type, payload } = event;
  const p = payload as TaskEvent["payload"];
  switch (type) {
    case EventType.STATUS_CHANGED:
      return `Status moved ${p.oldStatus} ➟ ${p.newStatus}`;
    case EventType.COMMENT_ADDED:
      return `${p.author}: "${p.text}"`;
    case EventType.TASK_CREATED:
      return "Task created";
    case EventType.TASK_UPDATED:
      return "Task updated";
    case EventType.TASK_DELETED:
      return "Task deleted";
    case EventType.CI_RAN:
      return `CI Check ran: ${p.summary}`;
    default:
      return (type as string).replace(/_/g, " ").toLowerCase();
  }
}
