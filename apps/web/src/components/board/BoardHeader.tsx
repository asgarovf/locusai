/**
 * Board page header component
 * Displays sprint info and new task button
 */

import { type Sprint } from "@locusai/shared";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";

interface BoardHeaderProps {
  activeSprint?: Sprint | null;
  filteredTasksCount: number;
  onNewTask: () => void;
}

export function BoardHeader({
  activeSprint,
  filteredTasksCount,
  onNewTask,
}: BoardHeaderProps) {
  return {
    title: "Board",
    description: (
      <div className="flex items-center gap-2">
        {activeSprint ? (
          <>
            <span className="text-primary font-bold">{activeSprint.name}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>{filteredTasksCount} tasks</span>
          </>
        ) : (
          <span>No active sprint</span>
        )}
      </div>
    ),
    actions: (
      <Button
        onClick={onNewTask}
        size="md"
        className="shadow-lg shadow-primary/20"
      >
        <Plus size={18} className="mr-2" />
        New Task
      </Button>
    ),
  };
}
