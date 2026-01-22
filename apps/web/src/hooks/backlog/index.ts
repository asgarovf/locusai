/**
 * Backlog Hooks - Composite Export
 *
 * For backward compatibility, export all backlog hooks.
 * Prefer using individual hooks for better tree-shaking and clarity.
 */

export * from "./useBacklogActions";
// Composite hook for components not yet refactored
export { useBacklogComposite as useBacklog } from "./useBacklogComposite";
export * from "./useBacklogData";
export * from "./useBacklogDragDrop";
export * from "./useBacklogUI";
