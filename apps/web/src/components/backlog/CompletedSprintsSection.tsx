/**
 * Completed Sprints Section Component
 *
 * Displays a collapsible section containing all completed sprints.
 * Allows viewing historical sprint data and completed tasks.
 */

"use client";

import { type Sprint, type Task } from "@locusai/shared";
import { motion } from "framer-motion";
import { Archive } from "lucide-react";
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
      >
        <div className="space-y-2 mt-2">
          {sprints.map((sprint) => (
            <CompletedSprintItem
              key={sprint.id}
              name={sprint.name}
              taskCount={getSprintTasks(sprint.id).length}
              tasks={getSprintTasks(sprint.id)}
              isExpanded={collapsedSections.has(
                `completed-sprint-${sprint.id}`
              )}
              onToggle={() => onToggleSprint(`completed-sprint-${sprint.id}`)}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </BacklogSection>
    </motion.div>
  );
}
