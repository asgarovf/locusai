/**
 * Backlog UI State Hook
 *
 * Manages UI state for the backlog page (modals, selections, expanded sections).
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export interface BacklogUIState {
  isTaskModalOpen: boolean;
  isSprintModalOpen: boolean;
  selectedTaskId: string | null;
  collapsedSections: Set<string>;
}

export interface BacklogUIActions {
  setIsTaskModalOpen: (open: boolean) => void;
  setIsSprintModalOpen: (open: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  toggleSection: (section: string) => void;
}

/**
 * Manage backlog UI state including modals and section expansion
 */
export function useBacklogUI(): BacklogUIState & BacklogUIActions {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(["completed"])
  );

  // Handle query parameters for new task/sprint
  useEffect(() => {
    const createTask = searchParams.get("createTask");
    const createSprint = searchParams.get("createSprint");

    if (createTask === "true") {
      setIsTaskModalOpen(true);
      router.replace("/backlog");
    } else if (createSprint === "true") {
      setIsSprintModalOpen(true);
      router.replace("/backlog");
    }
  }, [searchParams, router]);

  const toggleSection = (section: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section);
    } else {
      newCollapsed.add(section);
    }
    setCollapsedSections(newCollapsed);
  };

  return {
    isTaskModalOpen,
    isSprintModalOpen,
    selectedTaskId,
    collapsedSections,
    setIsTaskModalOpen,
    setIsSprintModalOpen,
    setSelectedTaskId,
    toggleSection,
  };
}
