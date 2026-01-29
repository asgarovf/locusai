"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { type Task } from "@locusai/shared";
import { cn } from "@/lib/utils";

interface DroppableSectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableSection({
  id,
  children,
  className,
}: DroppableSectionProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-all duration-200",
        isOver && "bg-primary/10 ring-2 ring-primary/30 ring-dashed",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DraggableTaskProps {
  task: Task;
  children: React.ReactNode;
}

export function DraggableTask({ task, children }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all",
        isDragging && "opacity-50 scale-[0.98]"
      )}
    >
      {children}
    </div>
  );
}
