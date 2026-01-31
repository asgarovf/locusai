/**
 * Bulk Actions Bar Component
 *
 * Floating action bar for bulk task operations.
 * Displays selection count, sprint selector, and action buttons.
 *
 * @example
 * <BulkActionsBar
 *   selectedCount={5}
 *   sprints={availableSprints}
 *   onMoveToSprint={handleBulkMove}
 *   onClearSelection={handleClear}
 * />
 */

"use client";

import { type Sprint, SprintStatus } from "@locusai/shared";
import { motion } from "framer-motion";
import { ArrowRight, CheckSquare, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  /** Number of selected tasks */
  selectedCount: number;
  /** Available sprints for bulk move */
  sprints: Sprint[];
  /** Called when moving tasks to a sprint */
  onMoveToSprint: (sprintId: string) => Promise<void>;
  /** Called when clearing selection */
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  sprints,
  onMoveToSprint,
  onClearSelection,
}: BulkActionsBarProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);

  const activeSprints = sprints.filter((s) => s.status === SprintStatus.ACTIVE);
  const plannedSprints = sprints.filter(
    (s) => s.status === SprintStatus.PLANNED
  );

  const handleMove = async () => {
    if (!selectedSprintId) return;

    try {
      setIsMoving(true);
      await onMoveToSprint(selectedSprintId);
      setSelectedSprintId("");
    } catch (error) {
      console.error("Failed to move tasks:", error);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 lg:bottom-6 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="glass border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-3 sm:p-4 min-w-[90vw] sm:min-w-[400px] max-w-[90vw] sm:max-w-none">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Selection Count */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/10 rounded-lg border border-primary/20">
            <CheckSquare size={14} className="text-primary sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
              {selectedCount}
            </span>
          </div>

          {/* Sprint Selector */}
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className={cn(
              "flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-secondary/50 border border-border rounded-lg text-xs sm:text-sm font-medium min-w-0",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-all cursor-pointer hover:bg-secondary/70"
            )}
            disabled={isMoving}
          >
            <option value="">Select sprint...</option>
            {activeSprints.length > 0 && (
              <optgroup label="Active Sprints">
                {activeSprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </optgroup>
            )}
            {plannedSprints.length > 0 && (
              <optgroup label="Planned Sprints">
                {plannedSprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* Move Button */}
          <Button
            onClick={handleMove}
            disabled={!selectedSprintId || isMoving}
            className="px-2 sm:px-4 py-1.5 sm:py-2 h-auto shadow-lg shadow-primary/20 text-xs sm:text-sm"
          >
            {isMoving ? (
              <span className="flex items-center gap-1 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Moving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 sm:gap-2">
                <span className="hidden sm:inline">Move</span>
                <ArrowRight size={14} className="sm:w-4 sm:h-4" />
              </span>
            )}
          </Button>

          {/* Clear Button */}
          <button
            onClick={onClearSelection}
            disabled={isMoving}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-all active:scale-95 disabled:opacity-50"
          >
            <X size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
