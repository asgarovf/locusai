"use client";

import {
  AssigneeRole,
  EventType,
  type Event as TaskEvent,
  TaskPriority,
  TaskStatus,
} from "@locusai/shared";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
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
import React from "react";
import { PropertyItem } from "@/components";
import {
  Button,
  Checkbox,
  EmptyState,
  Input,
  PriorityBadge,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { useTaskPanel } from "@/hooks/useTaskPanel";
import { cn } from "@/lib/utils";

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
  const {
    task,
    isEditingTitle,
    setIsEditingTitle,
    editTitle,
    setEditTitle,
    editDesc,
    setEditDesc,
    newComment,
    setNewComment,
    newChecklistItem,
    setNewChecklistItem,
    descMode,
    setDescMode,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,
    isLocked,
    checklistProgress,
    handleUpdateTask,
    handleDelete,
    handleTitleSave,
    handleDescSave,
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleRemoveChecklistItem,
    handleAddComment,
    handleRunCi,
    handleLock,
    handleUnlock,
    handleReject,
    handleApprove,
  } = useTaskPanel({ taskId, onUpdated, onDeleted, onClose });

  const formatDate = (date: string | number | Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-940"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.5 }}
        className="fixed top-0 right-0 bottom-0 w-[1000px] max-w-[95vw] bg-background border-l border-border z-950 flex flex-col shadow-2xl"
      >
        {!task ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">
                Synchronizing Task Stream...
              </div>
            </div>
          </div>
        ) : (
          <>
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
                  <PriorityBadge
                    priority={task.priority || TaskPriority.MEDIUM}
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
                <div className="w-px h-6 bg-border mx-2" />
                {task.status === TaskStatus.VERIFICATION && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowRejectModal(true)}
                      className="h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px]"
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleApprove}
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
                  onClick={handleDelete}
                  title="Delete"
                  className="h-10 w-10 hover:scale-105 active:scale-95 transition-transform rounded-xl"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </header>

            <div className="flex-1 grid grid-cols-[1fr_360px] overflow-hidden min-h-0">
              <div className="p-8 overflow-y-auto scrollbar-thin">
                {/* Title Section */}
                <div className="mb-8">
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
                      className="text-3xl h-16 font-black tracking-tight bg-secondary/20 border-primary/20 rounded-2xl px-6"
                      autoFocus
                    />
                  ) : (
                    <h2
                      className="text-3xl font-black tracking-tight hover:text-primary transition-all cursor-pointer leading-tight group flex items-start"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {task.title}
                      <Edit
                        size={18}
                        className="ml-4 mt-1.5 opacity-0 group-hover:opacity-40 transition-opacity"
                      />
                    </h2>
                  )}
                </div>

                {/* Description Section */}
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <FileText size={16} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                        Technical Documentation
                      </h4>
                    </div>
                    <div className="flex bg-secondary/40 p-1 rounded-xl border border-border/20 shadow-inner">
                      <button
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          descMode === "preview"
                            ? "bg-background shadow-md text-primary scale-105"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setDescMode("preview")}
                      >
                        Visual
                      </button>
                      <button
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                          descMode === "edit"
                            ? "bg-background shadow-md text-primary scale-105"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setDescMode("edit")}
                      >
                        Markdown
                      </button>
                    </div>
                  </div>

                  {descMode === "edit" ? (
                    <div className="group border border-border/40 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-secondary/5 shadow-inner">
                      <Textarea
                        value={editDesc}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setEditDesc(e.target.value)
                        }
                        placeholder="Define implementation architecture, requirements, and scope..."
                        rows={12}
                        className="border-none focus:ring-0 text-base leading-relaxed p-8 bg-transparent scrollbar-thin"
                        onBlur={handleDescSave}
                      />
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none bg-secondary/10 p-10 rounded-3xl border border-border/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] relative group">
                      {task.description ? (
                        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                          {task.description}
                        </p>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-30 select-none">
                          <FileText size={32} className="mb-4" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">
                            Waiting for Specs
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Acceptance Checklist */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                        <CheckCircle size={16} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                        Definition of Done
                      </h4>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1.5">
                          Calibration
                        </span>
                        <span className="text-sm font-mono font-black text-sky-500">
                          {checklistProgress}%
                        </span>
                      </div>
                      <div className="w-48 h-2 bg-secondary/40 rounded-full overflow-hidden border border-border/30 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${checklistProgress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 mb-6">
                    {task.acceptanceChecklist.length === 0 && (
                      <EmptyState
                        variant="compact"
                        title="Zero Quality Gates"
                        description="Deployment requires standard validation criteria."
                        className="bg-secondary/5 border-dashed border-2 border-border/40 py-8"
                        action={
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setNewChecklistItem("Initialize unit validation")
                            }
                            className="text-[10px] font-black uppercase tracking-widest hover:text-sky-500"
                          >
                            Suggest Criteria
                          </Button>
                        }
                      />
                    )}
                    {task.acceptanceChecklist.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        className="group flex items-center gap-4 p-4 bg-card/30 border border-border/40 rounded-2xl hover:border-sky-500/50 hover:bg-card/50 transition-all duration-300 shadow-sm"
                      >
                        <Checkbox
                          checked={item.done}
                          onChange={() => handleToggleChecklistItem(item.id)}
                          className="scale-110"
                        />
                        <span
                          className={cn(
                            "flex-1 text-sm font-bold transition-all duration-300",
                            item.done
                              ? "line-through text-muted-foreground/30 scale-[0.98] translate-x-1"
                              : "text-foreground/90"
                          )}
                        >
                          {item.text}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                        >
                          <X size={14} />
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex gap-4 p-2.5 bg-secondary/5 rounded-2xl border border-border/40 focus-within:border-primary/40 transition-all shadow-inner">
                    <Input
                      value={newChecklistItem}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewChecklistItem(e.target.value)
                      }
                      placeholder="Add validation gate..."
                      className="h-10 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") handleAddChecklistItem();
                      }}
                    />
                    <Button
                      onClick={handleAddChecklistItem}
                      className="px-6 h-10 bg-foreground text-background font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all rounded-xl"
                    >
                      Append
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto border-l border-border bg-secondary/10 backdrop-blur-3xl shadow-[inset_1px_0_0_rgba(255,255,255,0.02)] scrollbar-thin">
                {/* Properties Section */}
                <div className="mb-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-6 pb-2 border-b border-border/40">
                    Mission Specs
                  </h4>
                  <div className="space-y-3">
                    <PropertyItem
                      label="State"
                      value={task.status}
                      onEdit={(newValue: string) =>
                        handleUpdateTask({ status: newValue as TaskStatus })
                      }
                      options={Object.values(TaskStatus)}
                      type="dropdown"
                    />
                    <PropertyItem
                      label="Role"
                      value={task.assigneeRole || "Unassigned"}
                      onEdit={(newValue: string) =>
                        handleUpdateTask({
                          assigneeRole: newValue as AssigneeRole,
                        })
                      }
                      options={Object.values(AssigneeRole)}
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
                        task.dueDate ? formatDate(task.dueDate) : "Undetermined"
                      }
                      onEdit={(newValue: string) =>
                        handleUpdateTask({ dueDate: newValue || null })
                      }
                      type="date"
                    />
                    <PropertyItem
                      label="Operator"
                      value={task.assignedTo || "Available"}
                      onEdit={(newValue: string) =>
                        handleUpdateTask({ assignedTo: newValue || null })
                      }
                      type="text"
                    />
                  </div>
                </div>

                {/* Artifacts Section */}
                <div className="mb-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-6 pb-2 border-b border-border/40">
                    Output Pipeline
                  </h4>
                  <div className="grid gap-3">
                    {task.artifacts.length > 0 ? (
                      task.artifacts.map((artifact) => (
                        <a
                          key={artifact.id}
                          href={artifact.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-4 p-4 bg-background/40 border border-border/30 rounded-2xl hover:border-primary/50 hover:bg-background transition-all duration-300 shadow-sm"
                        >
                          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 border border-primary/5">
                            <FileText size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-black truncate text-foreground/90 tracking-wide">
                              {artifact.title}
                            </span>
                            <span className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mt-1.5 block">
                              {artifact.type} • {artifact.size}
                            </span>
                          </div>
                        </a>
                      ))
                    ) : (
                      <EmptyState
                        variant="minimal"
                        title="Draft Phase"
                        className="py-10 border-dashed border-2 border-border/30 rounded-2xl opacity-40"
                      />
                    )}
                  </div>
                </div>

                {/* Activity Feed */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-6 pb-2 border-b border-border/40">
                    Neural Stream
                  </h4>

                  <div className="flex gap-3 mb-6 bg-background/30 p-2 rounded-2xl border border-border/40 shadow-inner focus-within:border-primary/30 transition-all">
                    <Input
                      value={newComment}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewComment(e.target.value)
                      }
                      placeholder="Transmit logs..."
                      className="h-10 text-xs font-bold bg-transparent border-none focus:ring-0 placeholder:font-black placeholder:uppercase placeholder:text-[9px] placeholder:tracking-[0.2em]"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") handleAddComment();
                      }}
                    />
                    <Button
                      onClick={handleAddComment}
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
                      task.activityLog.map((event: TaskEvent) => (
                        <div
                          key={event.id}
                          className="relative flex gap-6 group"
                        >
                          <div className="absolute left-[19px] top-10 bottom-[-28px] w-px bg-border/40 group-last:hidden" />
                          <div className="h-10 w-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center shrink-0 z-10 shadow-sm group-hover:border-primary/40 transition-all group-hover:scale-110">
                            {event.type === EventType.COMMENT_ADDED && (
                              <MessageSquare
                                size={14}
                                className="text-blue-500"
                              />
                            )}
                            {event.type === EventType.STATUS_CHANGED && (
                              <Tag size={14} className="text-amber-500" />
                            )}
                            {event.type === EventType.TASK_CREATED && (
                              <PlusSquare
                                size={14}
                                className="text-emerald-400"
                              />
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
                          <div className="pt-2 min-w-0">
                            <p className="text-xs font-bold text-foreground/80 leading-snug mb-2">
                              {formatActivityEvent(event)}
                            </p>
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/30">
                              {formatDistanceToNow(new Date(event.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        variant="minimal"
                        title="Silent Stream"
                        className="py-12 opacity-30"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-960 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border/40 rounded-3xl p-8 w-full max-w-[500px] shadow-2xl shadow-black"
          >
            <h3 className="text-xl font-black uppercase tracking-widest text-destructive mb-4">
              Reject Mission
            </h3>
            <p className="text-sm text-muted-foreground/80 mb-6 font-medium leading-relaxed">
              This task will be demoted to IN_PROGRESS. Assigned operators will
              receive your feedback for recalibration.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Detailed failure report and corrective actions..."
              className="min-h-[140px] mb-6 bg-secondary/20 border-border/40 rounded-2xl p-4 font-bold text-sm focus:ring-destructive/20"
              autoFocus
            />
            <div className="flex gap-4 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20"
              >
                Confirm Rejection
              </Button>
            </div>
          </motion.div>
        </div>
      )}
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
