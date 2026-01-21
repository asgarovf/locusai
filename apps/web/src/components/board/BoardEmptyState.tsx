"use client";

import { Inbox, Layers, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, EmptyState } from "@/components/ui";

interface BoardEmptyStateProps {
  hasActiveSprint: boolean;
  onNewTask: () => void;
}

export function BoardEmptyState({
  hasActiveSprint,
  onNewTask,
}: BoardEmptyStateProps) {
  const router = useRouter();

  if (!hasActiveSprint) {
    return (
      <EmptyState
        icon={Layers}
        title="No Active Sprint"
        description="There is no active sprint currently. Go to the backlog to plan and start a new sprint."
        action={
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/backlog")}
            >
              <Layers size={16} />
              Go to Backlog
            </Button>
            <Button
              className="gap-2"
              onClick={() => router.push("/backlog?createSprint=true")}
            >
              <Plus size={16} />
              Create Sprint
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Inbox}
      title="No tasks in Sprint"
      description="The active sprint has no tasks yet. Add tasks from the backlog or create new ones."
      action={
        <Button onClick={onNewTask} className="shadow-lg shadow-primary/20">
          <Plus size={18} className="mr-2" />
          New Task
        </Button>
      }
    />
  );
}
