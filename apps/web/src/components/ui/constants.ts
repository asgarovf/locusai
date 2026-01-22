/**
 * UI Component Constants
 *
 * Centralized constants for UI components including sizes, variants, and styling
 * This ensures consistency across all UI components and makes maintenance easier.
 */

/**
 * Button component sizes and their corresponding Tailwind classes
 */
export const BUTTON_SIZES = {
  sm: "h-8 px-3 text-[10px] uppercase tracking-wider",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-8 text-base",
  icon: "h-10 w-10 p-0",
} as const;

/**
 * Button component variants and their styling
 */
export const BUTTON_VARIANTS = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:translate-y-[-1px] hover:shadow-md",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  subtle: "bg-primary/10 text-primary hover:bg-primary/20",
  outline: "border border-border bg-transparent hover:bg-secondary/50",
  ghost: "hover:bg-secondary text-muted-foreground hover:text-foreground",
  danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  success: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  emerald: "bg-emerald-500 text-white hover:bg-emerald-600",
  amber: "bg-amber-500 text-black hover:bg-amber-600 font-bold",
  "emerald-subtle":
    "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20",
  "amber-subtle":
    "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20",
} as const;

/**
 * Badge component sizes
 */
export const BADGE_SIZES = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
} as const;

/**
 * Badge component variants
 */
export const BADGE_VARIANTS = {
  default: "bg-primary/10 text-primary border border-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  danger: "bg-red-500/10 text-red-500 border border-red-500/20",
  info: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
} as const;

/**
 * Modal sizes
 */
export const MODAL_SIZES = {
  sm: "w-[400px]",
  md: "w-[520px]",
  lg: "w-[680px]",
} as const;

/**
 * Spinner sizes
 */
export const SPINNER_SIZES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
} as const;

/**
 * Z-index scale for proper layering
 */
export const Z_INDEXES = {
  base: "z-0",
  dropdown: "z-100",
  sticky: "z-500",
  fixed: "z-900",
  modalOverlay: "z-940",
  modal: "z-950",
  tooltip: "z-1000",
  notification: "z-1100",
} as const;

/**
 * Transition durations for consistent animations
 */
export const TRANSITIONS = {
  fast: "duration-100",
  normal: "duration-200",
  slow: "duration-300",
} as const;

/**
 * Border radius constants
 */
export const BORDER_RADIUS = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  full: "rounded-full",
} as const;
