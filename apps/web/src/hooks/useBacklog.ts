"use client";

import { type Sprint, SprintStatus, type Task } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { sprintService } from "@/services/sprint.service";
import { taskService } from "@/services/task.service";
import { useGlobalKeydowns } from "./useGlobalKeydowns";

export function useBacklog() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCompletedSprints, setShowCompletedSprints] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState<Set<number>>(
    new Set()
  );
  const [manuallyCollapsedSprints, setManuallyCollapsedSprints] = useState<
    Set<number>
  >(new Set());
  const isInitialized = useRef(false);
  const [backlogExpanded, setBacklogExpanded] = useState(true);
  const [manuallyCollapsedBacklog, setManuallyCollapsedBacklog] =
    useState(false);
  const prevBacklogTasksRef = useRef<number>(0);
  const [dragOverSection, setDragOverSection] = useState<
    number | "backlog" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ["sprints"],
    queryFn: sprintService.getAll,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: taskService.getAll,
  });

  const createSprint = useMutation({
    mutationFn: sprintService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      setIsCreatingSprint(false);
      toast.success("Sprint created");
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Task> }) =>
      taskService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Auto-expand target sprint if not manually collapsed
      if (variables.updates.sprintId) {
        const sprintId = variables.updates.sprintId;
        if (!manuallyCollapsedSprints.has(sprintId)) {
          setExpandedSprints((prev) => new Set(prev).add(sprintId));
        }
      }

      // Auto-expand backlog if moving to backlog and not manually collapsed
      if (variables.updates.sprintId === null && !manuallyCollapsedBacklog) {
        setBacklogExpanded(true);
      }
    },
  });

  const updateSprint = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Sprint> }) =>
      sprintService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("Sprint updated");
    },
  });

  const deleteSprint = useMutation({
    mutationFn: (id: number) => sprintService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Sprint deleted");
    },
  });

  const handleCreateSprint = useCallback(
    (name: string) => {
      createSprint.mutate({ name });
    },
    [createSprint]
  );

  const handleStartSprint = useCallback(
    (sprint: Sprint) => {
      updateSprint.mutate({
        id: sprint.id,
        updates: {
          status: SprintStatus.ACTIVE,
          startDate: Date.now(),
        },
      });
    },
    [updateSprint]
  );

  const handleCompleteSprint = useCallback(
    (sprint: Sprint) => {
      updateSprint.mutate({
        id: sprint.id,
        updates: {
          status: SprintStatus.COMPLETED,
          endDate: Date.now(),
        },
      });
    },
    [updateSprint]
  );

  const handleDeleteSprint = useCallback(
    (sprint: Sprint) => {
      if (
        confirm(
          `Delete "${sprint.name}" and all its tasks? This cannot be undone.`
        )
      ) {
        deleteSprint.mutate(sprint.id);
      }
    },
    [deleteSprint]
  );

  // Auto-expand active sprints on initial load
  useEffect(() => {
    if (sprints.length > 0 && !isInitialized.current) {
      const activeSprintIds = sprints
        .filter((s: Sprint) => s.status === SprintStatus.ACTIVE)
        .map((s: Sprint) => s.id);

      if (activeSprintIds.length > 0) {
        setExpandedSprints(new Set(activeSprintIds));
        isInitialized.current = true;
      }
    }
  }, [sprints]);

  useGlobalKeydowns({
    onOpenCreateTask: () => setIsCreateTaskOpen(true),
    onOpenCreateSprint: () => setIsCreatingSprint(true),
    onCloseCreateTask: () => {
      if (selectedTaskId) setSelectedTaskId(null);
      if (isCreateTaskOpen) setIsCreateTaskOpen(false);
      if (isCreatingSprint) setIsCreatingSprint(false);
    },
  });

  // Handle URL-based actions (e.g., from global keyboard shortcuts)
  useEffect(() => {
    if (searchParams.get("createTask") === "true") {
      setIsCreateTaskOpen(true);
      // Clean up the URL parameter immediately so it doesn't stay there
      const params = new URLSearchParams(searchParams.toString());
      params.delete("createTask");
      const newQuery = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/backlog${newQuery}`);
    }

    if (searchParams.get("createSprint") === "true") {
      setIsCreatingSprint(true);
      // Clean up the URL parameter immediately so it doesn't stay there
      const params = new URLSearchParams(searchParams.toString());
      params.delete("createSprint");
      const newQuery = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/backlog${newQuery}`);
    }
  }, [searchParams, router]);

  const toggleSprintExpand = useCallback((sprintId: number) => {
    setExpandedSprints((prev) => {
      const isExpanding = !prev.has(sprintId);
      const next = new Set(prev);

      if (isExpanding) {
        next.add(sprintId);
        setManuallyCollapsedSprints((m) => {
          const nextM = new Set(m);
          nextM.delete(sprintId);
          return nextM;
        });
      } else {
        next.delete(sprintId);
        setManuallyCollapsedSprints((m) => new Set(m).add(sprintId));
      }
      return next;
    });
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(
      (t: Task) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tasks, searchQuery]);

  const backlogTasks = useMemo(
    () => filteredTasks.filter((t: Task) => !t.sprintId),
    [filteredTasks]
  );

  const { activeSprints, plannedSprints, completedSprints } = useMemo(
    () => ({
      activeSprints: sprints.filter(
        (s: Sprint) => s.status === SprintStatus.ACTIVE
      ),
      plannedSprints: sprints.filter(
        (s: Sprint) => s.status === SprintStatus.PLANNED
      ),
      completedSprints: sprints.filter(
        (s: Sprint) => s.status === SprintStatus.COMPLETED
      ),
    }),
    [sprints]
  );

  // Auto-collapse backlog ONLY when it transitions from having tasks to being empty
  useEffect(() => {
    const prevLength = prevBacklogTasksRef.current;
    const currentLength = backlogTasks.length;

    if (prevLength > 0 && currentLength === 0 && backlogExpanded) {
      setBacklogExpanded(false);
    }

    prevBacklogTasksRef.current = currentLength;
  }, [backlogTasks.length, backlogExpanded]);

  const toggleBacklogExpand = useCallback(() => {
    const nextValue = !backlogExpanded;
    setBacklogExpanded(nextValue);
    setManuallyCollapsedBacklog(!nextValue);
  }, [backlogExpanded]);

  const handleDragOver = useCallback(
    (e: React.DragEvent, sectionId: number | "backlog") => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverSection(sectionId);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSprintId: number | null) => {
      e.preventDefault();
      setDragOverSection(null);
      const taskIdString = e.dataTransfer.getData("taskId");
      if (!taskIdString) return;

      const taskId = Number(taskIdString);
      updateTask.mutate({
        id: taskId,
        updates: { sprintId: targetSprintId },
      });
    },
    [updateTask]
  );

  const getTasksForSprint = useCallback(
    (sprintId: number) =>
      filteredTasks.filter((t: Task) => t.sprintId === sprintId),
    [filteredTasks]
  );

  return {
    sprints,
    sprintsLoading,
    tasks,
    tasksLoading,
    activeSprints,
    plannedSprints,
    completedSprints,
    backlogTasks,
    filteredTasks,
    searchQuery,
    setSearchQuery,
    isCreatingSprint,
    setIsCreatingSprint,
    isCreateTaskOpen,
    setIsCreateTaskOpen,
    selectedTaskId,
    setSelectedTaskId,
    showCompletedSprints,
    setShowCompletedSprints,
    expandedSprints,
    toggleSprintExpand,
    backlogExpanded,
    toggleBacklogExpand,
    dragOverSection,
    setDragOverSection,
    handleDragOver,
    handleDrop,
    handleCreateSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    getTasksForSprint,
    isSubmittingSprint: createSprint.isPending,
  };
}
