"use client";

import { type Task, TaskPriority, TaskStatus } from "@locusai/shared";
import { CheckCircle, ChevronRight, Lock, Trash2, Unlock } from "lucide-react";
import { Button, PriorityBadge, StatusBadge } from "@/components/ui";

interface TaskHeaderProps {
  task: Task;
  isLocked: boolean;
  onClose: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function TaskHeader({
  task,
  isLocked,
  onClose,
  onLock,
  onUnlock,
  onDelete,
  onApprove,
  onReject,
}: TaskHeaderProps) {
  return (
    <header className="flex items-center gap-6 px-10 border-b border-border bg-card/50 backdrop-blur-md h-[84px] shrink-0">
      <button
        className="p-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200 border border-transparent hover:border-border"
        onClick={onClose}
      >
        <ChevronRight size={20} />
      </button>

      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-1.5 block">
          Reference: #{task.id}
        </span>
        <div className="flex gap-3">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority || TaskPriority.MEDIUM} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLocked ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onUnlock}
            title="Unlock"
            className="h-10 w-10 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl"
          >
            <Unlock size={18} />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={onLock}
            title="Lock"
            className="h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-xl"
          >
            <Lock size={18} />
          </Button>
        )}
        <div className="w-px h-6 bg-border mx-2" />
        {task.status === TaskStatus.VERIFICATION && (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={onReject}
              className="h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="success"
              onClick={onApprove}
              className="h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              <CheckCircle size={16} className="mr-2" />
              Approve
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
          </>
        )}
        <Button
          size="icon"
          variant="danger"
          onClick={onDelete}
          title="Delete"
          className="h-10 w-10 hover:scale-105 active:scale-95 transition-transform rounded-xl"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </header>
  );
}
