"use client";

import {
  CheckCircle2,
  Kanban,
  Keyboard,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Play,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { BORDER_RADIUS, BUTTON_VARIANTS } from "@/components/ui/constants";
import { getStorageItem } from "@/lib/local-storage";
import { STORAGE_KEYS } from "@/lib/local-storage-keys";
import {
  backlogTour,
  boardTour,
  chatTour,
  dashboardTour,
  keyboardShortcutsTour,
  resetAllTours,
} from "@/lib/tour-steps";

interface Tour {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fn: () => void;
}

export const OnboardingTour = () => {
  const [completedTours, setCompletedTours] = useState<Set<string>>(
    new Set(
      typeof window !== "undefined"
        ? [
            getStorageItem(STORAGE_KEYS.TOUR_DASHBOARD_SEEN) === "true"
              ? "dashboard"
              : "",
            getStorageItem(STORAGE_KEYS.TOUR_BOARD_SEEN) === "true"
              ? "board"
              : "",
            getStorageItem(STORAGE_KEYS.TOUR_CHAT_SEEN) === "true"
              ? "chat"
              : "",
            getStorageItem(STORAGE_KEYS.TOUR_BACKLOG_SEEN) === "true"
              ? "backlog"
              : "",
          ].filter(Boolean)
        : []
    )
  );

  const tours: Tour[] = [
    {
      id: "dashboard",
      label: "Dashboard Tour",
      description: "Get started with workspace overview and quick actions",
      icon: LayoutDashboard,
      fn: dashboardTour,
    },
    {
      id: "board",
      label: "Board Views Tour",
      description: "Learn to manage tasks with kanban boards",
      icon: Kanban,
      fn: boardTour,
    },
    {
      id: "backlog",
      label: "Backlog & Sprints",
      description: "Master sprint planning and backlog management",
      icon: ListTodo,
      fn: backlogTour,
    },
    {
      id: "chat",
      label: "AI Chat Assistant",
      description: "Discover AI-powered task creation and insights",
      icon: MessageSquare,
      fn: chatTour,
    },
  ];

  const handleTourStart = (tour: Tour) => {
    tour.fn();
    setCompletedTours((prev) => new Set([...prev, tour.id]));
  };

  const handleReset = () => {
    resetAllTours();
    setCompletedTours(new Set());
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Interactive Tours
        </h2>
        <p className="text-muted-foreground text-sm">
          Learn how to use Locus with step-by-step guided tours. Click any tour
          to start.
        </p>
      </div>

      {/* Tours Grid */}
      <div className="grid gap-3 mb-6">
        {tours.map((tour) => {
          const Icon = tour.icon;
          const isCompleted = completedTours.has(tour.id);

          return (
            <button
              key={tour.id}
              onClick={() => handleTourStart(tour)}
              className={`
                group relative p-5 border border-border ${BORDER_RADIUS.lg}
                bg-linear-to-br from-transparent to-muted/20
                hover:from-muted/30 hover:to-muted/40
                hover:border-primary/30
                transition-all duration-200
                hover:translate-y-[-2px]
                hover:shadow-lg
                text-left
                overflow-hidden
              `}
            >
              {/* Background glow effect on hover */}
              <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`
                  shrink-0 w-12 h-12 rounded-lg
                  bg-primary/10
                  group-hover:bg-primary/20
                  border border-primary/20
                  flex items-center justify-center
                  transition-all duration-200
                  group-hover:scale-110
                `}
                >
                  <Icon className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-base">
                      {tour.label}
                    </h3>
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tour.description}
                  </p>
                </div>

                {/* Start button */}
                <div className="shrink-0 flex items-center">
                  <div
                    className={`
                    px-3 py-1.5 rounded-lg
                    ${BUTTON_VARIANTS.ghost}
                    text-xs font-medium uppercase tracking-wider
                    flex items-center gap-1.5
                    opacity-60 group-hover:opacity-100
                    transition-opacity
                  `}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Additional Actions */}
      <div className="border-t border-border pt-6 flex items-center justify-between">
        {/* Keyboard shortcuts */}
        <button
          onClick={keyboardShortcutsTour}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg
            ${BUTTON_VARIANTS.outline}
            text-sm font-medium
            transition-all duration-200
            hover:-translate-y-px
          `}
        >
          <Keyboard className="w-4 h-4" />
          <span>View Shortcuts</span>
        </button>

        {/* Reset tours */}
        <button
          onClick={handleReset}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg
            ${BUTTON_VARIANTS.ghost}
            text-sm font-medium text-muted-foreground
            hover:text-foreground
            transition-all duration-200
          `}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Progress</span>
        </button>
      </div>

      {/* Progress indicator */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Tours Completed
          </span>
          <span className="text-sm font-semibold text-foreground">
            {completedTours.size} / {tours.length}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary to-primary/70 transition-all duration-500"
            style={{
              width: `${(completedTours.size / tours.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
