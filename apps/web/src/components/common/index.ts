/**
 * Common Components
 *
 * Reusable components for standardized UI patterns across the application.
 *
 * ## Error State
 * Use `ErrorState` to display error messages with optional retry functionality.
 * Supports three variants: page, section, and inline.
 *
 * ```tsx
 * <ErrorState
 *   title="Failed to load"
 *   message="Please try again"
 *   onRetry={handleRetry}
 * />
 * ```
 *
 * ## Loading State
 * Use `LoadingState` to display loading indicators while data is being fetched.
 * Supports three variants: page, section, and inline.
 *
 * ```tsx
 * <LoadingState
 *   variant="section"
 *   message="Loading data..."
 * />
 * ```
 *
 * ## Usage Pattern
 * Use these components for:
 * - Data fetching states
 * - Form submission feedback
 * - API error handling
 * - Async operation feedback
 *
 * Keep error and loading states visible and accessible.
 */

export * from "./ErrorState";
export * from "./LoadingState";
