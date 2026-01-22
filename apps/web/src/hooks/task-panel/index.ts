/**
 * Task Panel Hooks - Composite Export
 *
 * For backward compatibility, export all task panel hooks.
 * Prefer using individual hooks for better tree-shaking and clarity.
 */

export * from "./useTaskActions";
export * from "./useTaskComputedValues";
export * from "./useTaskData";
// Composite hook for components not yet refactored
export { useTaskPanelComposite as useTaskPanel } from "./useTaskPanelComposite";
export * from "./useTaskUIState";
