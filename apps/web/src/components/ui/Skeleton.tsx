"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted/50", className)} />
  );
}

// Pre-built skeleton variants for common use cases

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

export function SkeletonTitle({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-6 w-3/4", className)} />;
}

export function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-8 w-8 rounded-full", className)} />;
}

export function SkeletonButton({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-9 w-24 rounded-lg", className)} />;
}

// Task Card Skeleton
export function TaskCardSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-card/50 border border-border/30 space-y-3">
      {/* Labels */}
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

// Column Skeleton for Board
export function BoardColumnSkeleton() {
  return (
    <div className="flex flex-col w-[280px] shrink-0 rounded-xl bg-card/50 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-6 rounded-md" />
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 p-2.5">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

// Full Board Skeleton
export function BoardSkeleton() {
  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Columns */}
      <div className="flex gap-4 min-h-[600px] pb-4">
        <BoardColumnSkeleton />
        <BoardColumnSkeleton />
        <BoardColumnSkeleton />
        <BoardColumnSkeleton />
      </div>
    </div>
  );
}

// Sprint Card Skeleton for Backlog
export function SprintCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-card/50 border border-border/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

// Backlog Skeleton
export function BacklogSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Sprints */}
      <div className="space-y-4">
        <SprintCardSkeleton />
        <SprintCardSkeleton />
      </div>
    </div>
  );
}

// Document Tree Skeleton
export function DocTreeSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/30">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-1/3" : "w-1/6")} />
      ))}
    </div>
  );
}
