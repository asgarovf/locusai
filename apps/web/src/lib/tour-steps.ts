/**
 * Locus Onboarding Tours
 * Interactive step-by-step guides using driver.js
 */

import { Config, DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/styles/driver-theme.css";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from "./local-storage";
import { STORAGE_KEYS } from "./local-storage-keys";

// Common driver configuration
const driverConfig: Partial<Config> = {
  showProgress: true,
  showButtons: ["next", "previous", "close"],
  nextBtnText: "Next",
  prevBtnText: "Previous",
  doneBtnText: "Done",
  progressText: "Step {{current}} of {{total}}",
  animate: true,
  allowKeyboardControl: true,
  disableActiveInteraction: false,
  popoverClass: "locus-tour-popover",
  overlayColor: "rgba(0, 0, 0, 0.5)",
  overlayOpacity: 0.4,
  overlayClickBehavior: "nextStep",
  stagePadding: 10,
  stageRadius: 10,
};

/**
 * Dashboard Tour
 * Introduces users to the main dashboard features
 */
export const dashboardTour = () => {
  const steps: DriveStep[] = [
    {
      element: "[data-tour='workspace-selector']",
      popover: {
        title: "Workspace Selector",
        description:
          "Switch between workspaces or create a new one. Each workspace keeps your projects and tasks organized separately.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='quick-actions']",
      popover: {
        title: "Quick Actions",
        description:
          "Create tasks instantly with Alt+N or start new sprints with Alt+S. These shortcuts work from anywhere in the app.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='stats-cards']",
      popover: {
        title: "Workspace Overview",
        description:
          "Get a quick snapshot of your workspace: total tasks, active sprints, team members, and recent activity.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='activity-feed']",
      popover: {
        title: "Activity Feed",
        description:
          "Stay updated with real-time changes. See who created, updated, or completed tasks across your workspace.",
        side: "left",
        align: "start",
      },
    },
  ];

  const driverObj = driver({
    ...driverConfig,
    steps,
    onDestroyStarted: () => {
      setStorageItem(STORAGE_KEYS.TOUR_DASHBOARD_SEEN, "true");
      driverObj.destroy();
    },
  });

  driverObj.drive();
  return driverObj;
};

/**
 * Board Tour
 * Guides users through the kanban board interface
 */
export const boardTour = () => {
  const steps: DriveStep[] = [
    {
      element: "[data-tour='board-header']",
      popover: {
        title: "Board View",
        description:
          "Visualize your workflow with a kanban board. Drag tasks between columns to update their status.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='board-filters']",
      popover: {
        title: "Filter & Search",
        description:
          "Filter tasks by assignee, priority, or sprint. Use the search bar to quickly find specific tasks.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='board-columns']",
      popover: {
        title: "Status Columns",
        description:
          "Each column represents a task status. Drag tasks through your workflow: Backlog → In Progress → In Review → Done.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='task-card']",
      popover: {
        title: "Task Cards",
        description:
          "Click any task card to view details, add comments, update properties, or link related tasks.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "[data-tour='add-task-btn']",
      popover: {
        title: "Quick Task Creation",
        description:
          "Click the + button in any column to create a task with that status, or use Alt+N anywhere.",
        side: "left",
        align: "start",
      },
    },
  ];

  const driverObj = driver({
    ...driverConfig,
    steps,
    onDestroyStarted: () => {
      setStorageItem(STORAGE_KEYS.TOUR_BOARD_SEEN, "true");
      driverObj.destroy();
    },
  });

  driverObj.drive();
  return driverObj;
};

/**
 * Chat Tour
 * Introduces the AI chat assistant features
 */
export const chatTour = () => {
  const steps: DriveStep[] = [
    {
      element: "[data-tour='chat-input']",
      popover: {
        title: "AI Assistant Chat",
        description:
          "Ask questions, get suggestions, or create tasks using natural language. The AI understands your workspace context.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='chat-suggestions']",
      popover: {
        title: "Smart Suggestions",
        description:
          "See suggested prompts to get started: create tasks, generate reports, analyze workload, or get productivity tips.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "[data-tour='chat-history']",
      popover: {
        title: "Conversation History",
        description:
          "Your chat history is saved. Scroll up to review previous conversations and task suggestions.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='chat-actions']",
      popover: {
        title: "Quick Actions",
        description:
          "Use action buttons in AI responses to instantly create tasks, copy text, or apply suggestions to your workspace.",
        side: "left",
        align: "start",
      },
    },
  ];

  const driverObj = driver({
    ...driverConfig,
    steps,
    onDestroyStarted: () => {
      setStorageItem(STORAGE_KEYS.TOUR_CHAT_SEEN, "true");
      driverObj.destroy();
    },
  });

  driverObj.drive();
  return driverObj;
};

/**
 * Backlog Tour
 * Guides users through sprint planning and backlog management
 */
export const backlogTour = () => {
  const steps: DriveStep[] = [
    {
      element: "[data-tour='backlog-list']",
      popover: {
        title: "Product Backlog",
        description:
          "Your backlog contains all unscheduled tasks. Drag tasks into sprints to plan your work.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='sprint-section']",
      popover: {
        title: "Active Sprint",
        description:
          "Your current sprint shows all tasks in progress. Track completion and manage scope here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "[data-tour='create-sprint-btn']",
      popover: {
        title: "Create Sprint",
        description:
          "Start a new sprint by clicking here or using Alt+S. Set a name, duration, and goal for your sprint.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='bulk-actions']",
      popover: {
        title: "Bulk Actions",
        description:
          "Select multiple tasks to update status, assign to sprints, or change priorities in one action.",
        side: "top",
        align: "start",
      },
    },
  ];

  const driverObj = driver({
    ...driverConfig,
    steps,
    onDestroyStarted: () => {
      setStorageItem(STORAGE_KEYS.TOUR_BACKLOG_SEEN, "true");
      driverObj.destroy();
    },
  });

  driverObj.drive();
  return driverObj;
};

/**
 * General keyboard shortcuts info
 */
export const keyboardShortcutsTour = () => {
  const steps: DriveStep[] = [
    {
      popover: {
        title: "Keyboard Shortcuts",
        description:
          "Master Locus with these shortcuts:\n\n• Alt+N - Create new task\n• Alt+S - Create new sprint\n• Cmd/Ctrl+K - Command palette\n• Esc - Close panels and modals",
      },
    },
  ];

  const driverObj = driver({
    ...driverConfig,
    showButtons: ["close"],
    steps,
  });

  driverObj.drive();
  return driverObj;
};

/**
 * Check if user has seen any tour
 */
export const hasSeenTour = (tourName: string): boolean => {
  const keyMap: Record<string, string> = {
    Dashboard: STORAGE_KEYS.TOUR_DASHBOARD_SEEN,
    Board: STORAGE_KEYS.TOUR_BOARD_SEEN,
    Chat: STORAGE_KEYS.TOUR_CHAT_SEEN,
    Backlog: STORAGE_KEYS.TOUR_BACKLOG_SEEN,
    Interview: STORAGE_KEYS.TOUR_INTERVIEW_SEEN,
  };

  const key = keyMap[tourName];
  return key ? getStorageItem(key) === "true" : false;
};

/**
 * Reset all tour progress (for testing or user preference)
 */
export const resetAllTours = (): void => {
  removeStorageItem(STORAGE_KEYS.TOUR_DASHBOARD_SEEN);
  removeStorageItem(STORAGE_KEYS.TOUR_BOARD_SEEN);
  removeStorageItem(STORAGE_KEYS.TOUR_CHAT_SEEN);
  removeStorageItem(STORAGE_KEYS.TOUR_BACKLOG_SEEN);
  removeStorageItem(STORAGE_KEYS.TOUR_INTERVIEW_SEEN);
};
