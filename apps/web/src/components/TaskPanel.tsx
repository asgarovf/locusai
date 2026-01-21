/**
 * Task Panel
 *
 * Side panel for task details, comments, and activity.
 */

"use client";

import { motion } from "framer-motion";
import { useTaskPanel } from "@/hooks/useTaskPanel";
import { TaskActivity } from "./task-panel/TaskActivity";
import { TaskArtifacts } from "./task-panel/TaskArtifacts";
import { TaskChecklist } from "./task-panel/TaskChecklist";
import { TaskDescription } from "./task-panel/TaskDescription";
import { TaskHeader } from "./task-panel/TaskHeader";
import { TaskProperties } from "./task-panel/TaskProperties";
import { Button, Textarea } from "./ui";

interface TaskPanelProps {
  taskId: string;
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
    handleLock,
    handleUnlock,
    handleReject,
    handleApprove,
  } = useTaskPanel({ taskId, onUpdated, onDeleted, onClose });

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
            <TaskHeader
              task={task}
              isLocked={isLocked || false}
              onClose={onClose}
              onLock={handleLock}
              onUnlock={handleUnlock}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={() => setShowRejectModal(true)}
            />

            <div className="flex-1 grid grid-cols-[1fr_360px] overflow-hidden min-h-0">
              <div className="flex flex-col overflow-y-auto scrollbar-thin">
                <TaskDescription
                  task={task}
                  isEditingTitle={isEditingTitle}
                  setIsEditingTitle={setIsEditingTitle}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  handleTitleSave={handleTitleSave}
                  editDesc={editDesc}
                  setEditDesc={setEditDesc}
                  handleDescSave={handleDescSave}
                  descMode={descMode}
                  setDescMode={setDescMode}
                />

                <TaskChecklist
                  task={task}
                  checklistProgress={checklistProgress}
                  newChecklistItem={newChecklistItem}
                  setNewChecklistItem={setNewChecklistItem}
                  handleAddChecklistItem={handleAddChecklistItem}
                  handleToggleChecklistItem={handleToggleChecklistItem}
                  handleRemoveChecklistItem={handleRemoveChecklistItem}
                />
              </div>

              <div className="p-6 overflow-y-auto border-l border-border bg-secondary/10 backdrop-blur-3xl shadow-[inset_1px_0_0_rgba(255,255,255,0.02)] scrollbar-thin">
                <TaskProperties task={task} onUpdate={handleUpdateTask} />
                <TaskArtifacts task={task} />
                <TaskActivity
                  task={task}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  handleAddComment={handleAddComment}
                />
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
