"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@locusai/shared";
import { TaskCard } from "@/components/TaskCard";
import { cn } from "@/lib/utils";

interface SortableTaskNodeProps {
  task: Task;
  onTaskClick: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
}

export function SortableTaskNode({
  task,
  onTaskClick,
  onTaskDelete,
}: SortableTaskNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative shrink-0 w-72 transition-all outline-none",
        isDragging && "opacity-50 scale-95 z-50 cursor-grabbing"
      )}
    >
      <TaskCard
        task={task}
        variant="card"
        onClick={() => onTaskClick(task.id)}
        onDelete={onTaskDelete}
      />
      {/* Drag Handle Overlay (optional visual cue, though whole card is draggable) */}
    </div>
  );
}
