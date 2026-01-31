/**
 * Completed Sprints Section Component
 *
 * Displays a collapsible section containing all completed sprints.
 * Allows viewing historical sprint data and completed tasks.
 */

"use client";

import { type Sprint, type Task } from "@locusai/shared";
import { motion } from "framer-motion";
import { Archive, ChevronsDown, ChevronsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getStorageItem, setStorageItem } from "@/lib/local-storage";
import { STORAGE_KEYS } from "@/lib/local-storage-keys";
import { BacklogSection } from "./BacklogSection";
import { CompletedSprintItem } from "./CompletedSprintItem";

interface CompletedSprintsSectionProps {
  /** Completed sprints */
  sprints: Sprint[];
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Called when toggling section */
  onToggle: () => void;
  /** Function to get tasks for a sprint */
  getSprintTasks: (sprintId: string) => Task[];
  /** Set of collapsed sprint IDs */
  collapsedSections: Set<string>;
  /** Called when toggling sprint item */
  onToggleSprint: (section: string) => void;
  /** Called when task is clicked */
  onTaskClick: (taskId: string) => void;
}

export function CompletedSprintsSection({
  sprints,
  isExpanded,
  onToggle,
  getSprintTasks,
  collapsedSections,
  onToggleSprint,
  onTaskClick,
}: CompletedSprintsSectionProps) {
  const [expandAll, setExpandAll] = useState(() => {
    if (typeof window === "undefined") return false;
    return getStorageItem(STORAGE_KEYS.EXPAND_COMPLETED_SPRINTS) === "true";
  });

  useEffect(() => {
    setStorageItem(STORAGE_KEYS.EXPAND_COMPLETED_SPRINTS, expandAll.toString());
  }, [expandAll]);

  if (sprints.length === 0) return null;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: 0.1 }}
      className="pt-4 border-t border-border/50"
    >
      <BacklogSection
        id="completed"
        title="Completed Sprints"
        icon={<Archive size={18} className="text-emerald-500/80" />}
        count={sprints.length}
        isExpanded={isExpanded}
        onToggle={onToggle}
        accentColor="green"
        actions={
          <button
            onClick={() => setExpandAll(!expandAll)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-md transition-colors"
            title={expandAll ? "Collapse All" : "Expand All"}
          >
            {expandAll ? (
              <>
                <ChevronsUp size={14} />
                <span className="hidden sm:inline">Collapse All</span>
              </>
            ) : (
              <>
                <ChevronsDown size={14} />
                <span className="hidden sm:inline">Expand All</span>
              </>
            )}
          </button>
        }
      >
        <div className="space-y-2 mt-2">
          {sprints.map((sprint) => {
            const sprintKey = `completed-sprint-${sprint.id}`;
            const isIndividuallyExpanded = collapsedSections.has(sprintKey);

            return (
              <CompletedSprintItem
                key={sprint.id}
                name={sprint.name}
                taskCount={getSprintTasks(sprint.id).length}
                tasks={getSprintTasks(sprint.id)}
                isExpanded={expandAll || isIndividuallyExpanded}
                onToggle={() => onToggleSprint(sprintKey)}
                onTaskClick={onTaskClick}
              />
            );
          })}
        </div>
      </BacklogSection>
    </motion.div>
  );
}
