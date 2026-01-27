/**
 * Backlog Data & Grouping Hook
 *
 * Manages task and sprint data grouping and organization.
 */

"use client";

import { type Sprint, SprintStatus, type Task } from "@locusai/shared";
import { useMemo } from "react";
import { useSprintsQuery, useTasksQuery } from "@/hooks";

export interface BacklogGroupedData {
  tasks: Task[];
  sprints: Sprint[];
  backlogTasks: Task[];
  activeSprint: Sprint | undefined;
  plannedSprints: Sprint[];
  completedSprints: Sprint[];
  isLoading: boolean;
}

export interface BacklogDataActions {
  getSprintTasks: (sprintId: string) => Task[];
  refetchTasks: () => void;
  refetchSprints: () => void;
}

/**
 * Manage backlog data grouping and organization
 */
export function useBacklogData(): BacklogGroupedData & BacklogDataActions {
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useTasksQuery();

  const {
    data: sprints = [],
    isLoading: sprintsLoading,
    refetch: refetchSprints,
  } = useSprintsQuery();

  const { backlogTasks, activeSprint, plannedSprints, completedSprints } =
    useMemo(() => {
      return {
        backlogTasks: tasks.filter((t) => !t.sprintId),
        activeSprint: sprints.find((s) => s.status === SprintStatus.ACTIVE),
        plannedSprints: sprints.filter(
          (s) => s.status === SprintStatus.PLANNED
        ),
        completedSprints: sprints.filter(
          (s) => s.status === SprintStatus.COMPLETED
        ),
      };
    }, [tasks, sprints]);

  const getSprintTasks = (sprintId: string) =>
    tasks.filter((t) => t.sprintId === sprintId);

  return {
    tasks,
    sprints,
    backlogTasks,
    activeSprint,
    plannedSprints,
    completedSprints,
    isLoading: tasksLoading || sprintsLoading,
    getSprintTasks,
    refetchTasks,
    refetchSprints,
  };
}
