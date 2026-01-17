"use client";

import {
  type AcceptanceItem,
  EventType,
  type Task,
  type Event as TaskEvent,
  TaskPriority,
  TaskStatus,
} from "@locus/shared";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  ChevronRight,
  Edit,
  FileText,
  Lock,
  MessageSquare,
  PlusSquare,
  Tag,
  Terminal,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PropertyItem } from "@/components/PropertyItem";
import { PriorityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { taskService } from "@/services/task.service";

interface TaskPanelProps {
  taskId: number;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function TaskPanel({
  taskId,
  onClose,
  onDeleted,
  onUpdated,
}: TaskPanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [descMode, setDescMode] = useState<"edit" | "preview">("preview");

  const formatDate = (date: string | number | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  const fetchTask = useCallback(async () => {
    try {
      const taskData = await taskService.getById(taskId);
      const initializedTask: Task = {
        ...taskData,
        acceptanceChecklist: taskData.acceptanceChecklist || [],
        artifacts: taskData.artifacts || [],
        activityLog: taskData.activityLog || [],
        comments: taskData.comments || [],
      };
      setTask(initializedTask);
      setEditTitle(taskData.title);
      setEditDesc(taskData.description || "");
    } catch (err) {
      console.error("Failed to fetch task:", err);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleUpdateTask = async (updates: Partial<Task>) => {
    try {
      await taskService.update(taskId, updates);
      fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await taskService.delete(taskId);
      onDeleted();
      onClose();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== task?.title) {
      handleUpdateTask({ title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    if (editDesc !== task?.description) {
      handleUpdateTask({ description: editDesc });
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim() || !task) return;
    const newItem: AcceptanceItem = {
      id: crypto.randomUUID(),
      text: newChecklistItem.trim(),
      done: false,
    };
    handleUpdateTask({
      acceptanceChecklist: [...task.acceptanceChecklist, newItem] as never,
    });
    setNewChecklistItem("");
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!task) return;
    const updated = task.acceptanceChecklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    handleUpdateTask({ acceptanceChecklist: updated as never });
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    if (!task) return;
    const updated = task.acceptanceChecklist.filter(
      (item) => item.id !== itemId
    );
    handleUpdateTask({ acceptanceChecklist: updated as never });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await taskService.addComment(taskId, {
        author: "Human",
        text: newComment,
      });
      setNewComment("");
      fetchTask();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleRunCi = async (preset: string) => {
    try {
      const data = await taskService.runCi(taskId, preset);
      alert(data.summary);
      fetchTask();
    } catch (err) {
      console.error("Failed to run CI:", err);
    }
  };

  const handleLock = async () => {
    try {
      await taskService.lock(taskId, "human", 3600);
      fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to lock task:", err);
    }
  };

  const handleUnlock = async () => {
    try {
      await taskService.unlock(taskId, "human");
      fetchTask();
      onUpdated();
    } catch (err) {
      console.error("Failed to unlock task:", err);
    }
  };

  if (!task) {
    return (
      <div className="fixed top-0 right-0 bottom-0 w-[1000px] max-w-[95vw] bg-background border-l border-border z-950 flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse font-medium">
          Loading task specs...
        </div>
      </div>
    );
  }

  const isLocked =
    task.lockedBy && (!task.lockExpiresAt || task.lockExpiresAt > Date.now());
  const checklistProgress = task.acceptanceChecklist.length
    ? Math.round(
        (task.acceptanceChecklist.filter((i) => i.done).length /
          task.acceptanceChecklist.length) *
          100
      )
    : 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-940 transition-all duration-300"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 bottom-0 w-[1000px] max-w-[95vw] bg-background border-l border-border z-950 flex flex-col shadow-[-20px_0_80px_rgba(0,0,0,0.6)] animate-in slide-in-from-right duration-400">
        <header className="flex items-center gap-6 px-10 border-b border-border bg-card/50 backdrop-blur-md h-[84px] shrink-0">
          <button
            className="p-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200 border border-transparent hover:border-border"
            onClick={onClose}
          >
            <ChevronRight size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-1 block">
              Reference: #{task.id}
            </span>
            <div className="flex gap-3">
              <StatusBadge status={task.status} />
              <PriorityBadge
                priority={
                  (task.priority as TaskPriority) || TaskPriority.MEDIUM
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleRunCi("quick")}
              title="Run Quality Checks"
              className="h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
            >
              <Terminal size={18} />
            </Button>
            {isLocked ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUnlock}
                title="Unlock"
                className="h-10 w-10 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl"
              >
                <Unlock size={18} />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLock}
                title="Lock"
                className="h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-xl"
              >
                <Lock size={18} />
              </Button>
            )}
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              size="icon"
              variant="danger"
              onClick={handleDelete}
              title="Delete"
              className="h-10 w-10 hover:scale-105 active:scale-95 transition-transform rounded-xl"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-[1fr_340px] overflow-hidden">
          <div className="p-12 overflow-y-auto scrollbar-thin">
            {/* Title Section */}
            <div className="mb-12">
              {isEditingTitle ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") {
                      setEditTitle(task.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="text-2xl h-14 font-bold tracking-tight"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-4xl font-black tracking-tight hover:text-primary transition-all cursor-pointer leading-tight group"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {task.title}
                  <Edit
                    size={18}
                    className="inline-block ml-3 opacity-0 group-hover:opacity-40 transition-opacity"
                  />
                </h2>
              )}
            </div>

            {/* Description Section */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <FileText size={16} />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/80">
                    Documentation
                  </h4>
                </div>
                <div className="flex bg-secondary/30 p-1 rounded-xl">
                  <button
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${descMode === "preview" ? "bg-background shadow-md text-foreground scale-105" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setDescMode("preview")}
                  >
                    Visual
                  </button>
                  <button
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${descMode === "edit" ? "bg-background shadow-md text-foreground scale-105" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setDescMode("edit")}
                  >
                    Markdown
                  </button>
                </div>
              </div>

              {descMode === "edit" ? (
                <div className="group border border-border rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-secondary/5">
                  <Textarea
                    value={editDesc}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditDesc(e.target.value)
                    }
                    placeholder="Describe the implementation details, edge cases, and technical requirements..."
                    rows={10}
                    className="border-none focus:ring-0 text-base leading-relaxed p-6 bg-transparent"
                    onBlur={handleDescSave}
                  />
                </div>
              ) : (
                <div className="prose prose-invert max-w-none bg-secondary/10 p-8 rounded-2xl border border-border/50 shadow-inner">
                  {task.description ? (
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  ) : (
                    <span className="text-muted-foreground/30 italic text-sm select-none">
                      Waiting for technical documentation...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Acceptance Checklist */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                    <CheckCircle size={16} />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/80">
                    Definition of Done
                  </h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      Status
                    </span>
                    <span className="text-sm font-mono font-black text-sky-500">
                      {checklistProgress}%
                    </span>
                  </div>
                  <div className="w-48 h-2 bg-secondary/30 rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-sky-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(14,165,233,0.5)]"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 mb-8">
                {task.acceptanceChecklist.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-2xl group hover:border-accent/40 transition-colors">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 mb-2 italic">
                      Standard quality checks required
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewChecklistItem("Add unit tests")}
                      className="text-xs hover:text-sky-500"
                    >
                      Suggest Criteria
                    </Button>
                  </div>
                )}
                {task.acceptanceChecklist.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-4 p-5 bg-secondary/10 border border-border/40 rounded-2xl hover:border-sky-500/50 hover:bg-secondary/20 transition-all duration-300 shadow-sm"
                  >
                    <Checkbox
                      checked={item.done}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="scale-125"
                    />
                    <span
                      className={`flex-1 text-sm font-semibold transition-all duration-300 ${item.done ? "line-through text-muted-foreground/40 scale-[0.98] translate-x-1" : "text-foreground"}`}
                    >
                      {item.text}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 p-2 bg-secondary/5 rounded-2xl border border-border/40">
                <Input
                  value={newChecklistItem}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewChecklistItem(e.target.value)
                  }
                  placeholder="Define quality metrics (e.g. Coverage > 80%, No regressions)..."
                  className="h-12 bg-transparent border-none focus:ring-0 text-sm font-medium"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleAddChecklistItem();
                  }}
                />
                <Button
                  onClick={handleAddChecklistItem}
                  className="px-8 h-12 bg-foreground text-background font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all rounded-xl"
                >
                  Append
                </Button>
              </div>
            </div>
          </div>

          <div className="p-10 overflow-y-auto border-l border-border bg-secondary/10 backdrop-blur-3xl shadow-[inset_1px_0_0_rgba(255,255,255,0.02)] scrollbar-thin">
            {/* Properties Section */}
            <div className="mb-12">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-8 pb-3 border-b border-border/40">
                Specifications
              </h4>
              <div className="space-y-2">
                <PropertyItem
                  label="Status"
                  value={task.status}
                  onEdit={(newValue: string) =>
                    handleUpdateTask({ status: newValue as TaskStatus })
                  }
                  options={Object.values(TaskStatus)}
                  type="dropdown"
                />
                <PropertyItem
                  label="Priority"
                  value={task.priority || TaskPriority.MEDIUM}
                  onEdit={(newValue: string) =>
                    handleUpdateTask({ priority: newValue as TaskPriority })
                  }
                  options={Object.values(TaskPriority)}
                  type="dropdown"
                />
                <PropertyItem
                  label="Deadline"
                  value={
                    task.dueDate ? formatDate(task.dueDate) : "Not Defined"
                  }
                  onEdit={(newValue: string) =>
                    handleUpdateTask({ dueDate: newValue || null })
                  }
                  type="date"
                />
                <PropertyItem
                  label="Owner"
                  value={task.assignedTo || "Open Seat"}
                  onEdit={(newValue: string) =>
                    handleUpdateTask({ assignedTo: newValue || null })
                  }
                  type="text"
                />
              </div>
            </div>

            {/* Artifacts Section */}
            <div className="mb-12">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-8 pb-3 border-b border-border/40">
                Generated Assets
              </h4>
              <div className="grid gap-3">
                {task.artifacts.length > 0 ? (
                  task.artifacts.map((artifact) => (
                    <a
                      key={artifact.id}
                      href={artifact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 p-4 bg-background/50 border border-border/40 rounded-2xl hover:border-primary/50 hover:bg-background transition-all duration-300 shadow-sm"
                    >
                      <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-black truncate text-foreground/90">
                          {artifact.title}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1 block">
                          {artifact.type} • {artifact.size}
                        </span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="py-10 text-center bg-background/20 rounded-2xl border border-dashed border-border/40">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 italic">
                      No output generated
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-8 pb-3 border-b border-border/40">
                Activity Stream
              </h4>

              <div className="flex gap-2 mb-10">
                <Input
                  value={newComment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewComment(e.target.value)
                  }
                  placeholder="Post an update..."
                  className="h-11 text-xs bg-background/40 border-border/40 rounded-xl focus:bg-background"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  className="h-11 px-5 rounded-xl group bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground"
                >
                  <MessageSquare
                    size={14}
                    className="group-hover:rotate-12 transition-transform"
                  />
                </Button>
              </div>

              <div className="space-y-8 max-h-[500px] overflow-y-auto pr-3 scrollbar-none hover:scrollbar-thin transition-all">
                {task.activityLog.map((event: TaskEvent) => (
                  <div key={event.id} className="relative flex gap-5 group">
                    <div className="absolute left-[17px] top-8 bottom-[-24px] w-px bg-border/40 group-last:hidden" />
                    <div className="h-9 w-9 rounded-xl bg-card border border-border/60 flex items-center justify-center shrink-0 z-10 shadow-sm group-hover:border-primary/40 transition-colors">
                      {event.type === EventType.COMMENT_ADDED && (
                        <MessageSquare size={14} className="text-blue-500" />
                      )}
                      {event.type === EventType.STATUS_CHANGED && (
                        <Tag size={14} className="text-amber-500" />
                      )}
                      {event.type === EventType.TASK_CREATED && (
                        <PlusSquare size={14} className="text-emerald-400" />
                      )}
                      {event.type === EventType.TASK_UPDATED && (
                        <Edit size={14} className="text-primary" />
                      )}
                      {event.type === EventType.ARTIFACT_ADDED && (
                        <FileText size={14} className="text-purple-400" />
                      )}
                      {(event.type === EventType.LOCKED ||
                        event.type === EventType.UNLOCKED) && (
                        <Lock size={14} className="text-rose-400" />
                      )}
                      {event.type === EventType.CI_RAN && (
                        <CheckCircle size={14} className="text-accent" />
                      )}
                    </div>
                    <div className="pt-1.5 min-w-0">
                      <p className="text-xs font-bold text-foreground/90 leading-snug mb-1.5">
                        {formatActivityEvent(event)}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function formatActivityEvent(event: TaskEvent): string {
  const { type, payload } = event;
  const p = payload as Record<string, string | number | undefined>;
  switch (type) {
    case EventType.STATUS_CHANGED:
      return `Status moved ${p.oldStatus} ➟ ${p.newStatus}`;
    case EventType.COMMENT_ADDED:
      return `${p.author}: "${p.text}"`;
    case EventType.TASK_CREATED:
      return "Task initialized";
    case EventType.TASK_UPDATED:
      return "Parameters calibrated";
    case EventType.ARTIFACT_ADDED:
      return `Output: ${p.title}`;
    case EventType.LOCKED:
      return `Protected by ${p.agentId}`;
    case EventType.UNLOCKED:
      return "Protection released";
    case EventType.CI_RAN:
      return `Valuation complete: ${p.summary}`;
    default:
      return (type as string).replace(/_/g, " ").toLowerCase();
  }
}
