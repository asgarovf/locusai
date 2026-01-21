"use client";

import { useEffect } from "react";

type UseGlobalKeydownsProps = {
  onOpenCreateTask?: () => void;
  onOpenCreateSprint?: () => void;
  onCloseCreateTask?: () => void;
};

export const useGlobalKeydowns = ({
  onOpenCreateTask = () => {
    /* no-op */
  },
  onOpenCreateSprint = () => {
    /* no-op */
  },
  onCloseCreateTask = () => {
    /* no-op */
  },
}: UseGlobalKeydownsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      if (isInput) {
        return;
      }

      if (e.altKey && e.code === "KeyN") {
        e.preventDefault();
        onOpenCreateTask();
      }

      if (e.altKey && e.code === "KeyS") {
        e.preventDefault();
        onOpenCreateSprint();
      }

      if (e.key === "Escape") {
        onCloseCreateTask();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenCreateTask, onOpenCreateSprint, onCloseCreateTask]);
};
