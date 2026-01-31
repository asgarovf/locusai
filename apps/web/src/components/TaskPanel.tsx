/**
 * Task Panel Component
 *
 * Side panel for displaying and editing task details.
 * Shows title, description, properties, activity, artifacts, checklists, and docs.
 * Integrates with `useTaskPanel` hook for comprehensive state management.
 *
 * Features:
 * - Task details and description editing
 * - Task properties (status, priority, assignee, deadline)
 * - Activity feed and comments
 * - Checklists
 * - Related documents
 * - Task approval (if in verification state)
 * - Task deletion
 *
 * @example
 * <TaskPanel
 *   taskId="task-123"
 *   onClose={handleClose}
 *   onDeleted={handleDeleted}
 *   onUpdated={handleUpdated}
 * />
 */

"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  CheckSquare,
  FileText,
  PanelLeftClose,
  PanelRight,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useGlobalKeydowns } from "@/hooks";
import { useTaskPanel } from "@/hooks/useTaskPanel";
import {
  TaskActivity,
  TaskChecklist,
  TaskDescription,
  TaskDocs,
  TaskHeader,
  TaskProperties,
} from "./task-panel";
import { Button, Textarea } from "./ui";

interface TaskPanelProps {
  /** ID of the task to display */
  taskId: string;
  /** Called when closing the panel */
  onClose: () => void;
  /** Called after task is deleted */
  onDeleted: () => void;
  /** Called after task is updated */
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
    isLoading,
    isDeleting,
    newComment,
    setNewComment,
    newChecklistItem,
    setNewChecklistItem,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,
    sidebarOpen,
    setSidebarOpen,
    checklistProgress,
    handleUpdateTask,
    handleDelete,
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleRemoveChecklistItem,
    handleAddComment,
    handleReject,
    handleApprove,
    handleLinkDoc,
    handleUnlinkDoc,
  } = useTaskPanel({ taskId, onUpdated, onDeleted, onClose });

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, [setSidebarOpen]);

  useGlobalKeydowns({
    onToggleSidebar: handleToggleSidebar,
  });

  const [activeTab, setActiveTab] = useState<
    "overview" | "checklist" | "docs" | "activity"
  >("overview");

  const tabs = useMemo(
    () => [
      { id: "overview" as const, label: "Overview", icon: FileText },
      { id: "checklist" as const, label: "Checklist", icon: CheckSquare },
      { id: "docs" as const, label: "Documents", icon: BookOpen },
      { id: "activity" as const, label: "Activity", icon: Activity },
    ],
    []
  );

  const handleCloseRejectModal = useCallback(() => {
    setShowRejectModal(false);
    setRejectReason("");
  }, [setShowRejectModal, setRejectReason]);

  const handleOpenRejectModal = useCallback(() => {
    setShowRejectModal(true);
  }, [setShowRejectModal]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[940]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.5 }}
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[600px] md:w-[800px] lg:w-[1000px] max-w-full bg-background border-l border-border z-950 flex flex-col shadow-2xl"
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
              isLoading={isLoading}
              isDeleting={isDeleting}
              onClose={onClose}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleOpenRejectModal}
            />

            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
              <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 flex-1 min-h-0 overflow-hidden">
                  {/* Main content */}
                  <div className="min-w-0 flex flex-col min-h-0 overflow-hidden">
                    {/* Tab navigation */}
                    <div className="flex overflow-x-auto scrollbar-thin border-b border-border mb-4 bg-background z-10 shrink-0">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`
                            flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0
                            ${
                              activeTab === tab.id
                                ? "border-b-2 border-primary text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            }
                          `}
                        >
                          <tab.icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Tab content - scrollable area */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                      {activeTab === "overview" && (
                        <TaskDescription
                          task={task}
                          isLoading={isLoading}
                          onUpdate={handleUpdateTask}
                        />
                      )}
                      {activeTab === "checklist" && (
                        <TaskChecklist
                          task={task}
                          isLoading={isLoading}
                          checklistProgress={checklistProgress}
                          newChecklistItem={newChecklistItem}
                          setNewChecklistItem={setNewChecklistItem}
                          handleAddChecklistItem={handleAddChecklistItem}
                          handleToggleChecklistItem={handleToggleChecklistItem}
                          handleRemoveChecklistItem={handleRemoveChecklistItem}
                        />
                      )}
                      {activeTab === "docs" && (
                        <TaskDocs
                          task={task}
                          onLinkDoc={handleLinkDoc}
                          onUnlinkDoc={handleUnlinkDoc}
                        />
                      )}
                      {activeTab === "activity" && (
                        <TaskActivity
                          task={task}
                          isLoading={isLoading}
                          newComment={newComment}
                          setNewComment={setNewComment}
                          handleAddComment={handleAddComment}
                        />
                      )}
                    </div>
                  </div>

                  {/* Toggle button (mobile) */}
                  <button
                    onClick={handleToggleSidebar}
                    className="lg:hidden fixed bottom-6 right-6 p-3 sm:p-4 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all z-[945]"
                    aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                  >
                    {sidebarOpen ? (
                      <PanelLeftClose size={20} />
                    ) : (
                      <PanelRight size={20} />
                    )}
                  </button>

                  {/* Sidebar backdrop (mobile only) */}
                  {sidebarOpen && (
                    <div
                      className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-952"
                      onClick={handleToggleSidebar}
                    />
                  )}

                  {/* Sidebar */}
                  <aside
                    className={`
                    fixed lg:static top-0 right-0 h-full
                    bg-background lg:bg-transparent border-l border-border
                    ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
                    transition-transform duration-300 ease-in-out
                    flex flex-col lg:bg-secondary/10 lg:backdrop-blur-3xl lg:shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]
                    w-full sm:w-[360px] max-w-[85vw] lg:w-auto
                    min-h-0 overflow-hidden
                    z-955
                  `}
                  >
                    {/* Toggle button (desktop) */}
                    <button
                      onClick={handleToggleSidebar}
                      className="hidden lg:flex absolute top-4 -left-10 p-2 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
                      aria-label={
                        sidebarOpen ? "Close sidebar" : "Open sidebar"
                      }
                    >
                      {sidebarOpen ? (
                        <PanelLeftClose size={16} />
                      ) : (
                        <PanelRight size={16} />
                      )}
                    </button>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 scrollbar-thin min-h-0">
                      <TaskProperties
                        task={task}
                        isLoading={isLoading}
                        onUpdate={handleUpdateTask}
                      />
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-970 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-[500px] shadow-2xl shadow-black"
          >
            <h3 className="text-xl font-black uppercase tracking-widest text-destructive mb-4">
              Reject Task
            </h3>
            <p className="text-sm text-muted-foreground/80 mb-6 font-medium leading-relaxed">
              This task will be demoted to IN_PROGRESS. Assigned assignees will
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
                onClick={handleCloseRejectModal}
                className="px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectReason.trim() || isLoading}
                className="px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20"
              >
                {isLoading ? "Processing..." : "Confirm Rejection"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
