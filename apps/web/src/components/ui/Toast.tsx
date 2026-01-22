"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

// Re-export toast for convenience
export { toast };

/**
 * Toaster component
 *
 * Renders the toast notification container.
 * Place at root level in your app (typically in layout).
 * Handles all notification positioning and styling.
 *
 * @example
 * // In layout.tsx
 * export default function Layout() {
 *   return (
 *     <>
 *       {children}
 *       <Toaster />
 *     </>
 *   );
 * }
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand={false}
      richColors
      theme="dark"
      toastOptions={{
        style: {
          background: "rgba(23, 23, 23, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
        },
        classNames: {
          toast: "rounded-xl shadow-xl",
          title: "font-semibold text-sm",
          description: "text-muted-foreground text-xs",
          success: "!bg-emerald-950/90 !border-emerald-500/30",
          error: "!bg-rose-950/90 !border-rose-500/30",
          warning: "!bg-amber-950/90 !border-amber-500/30",
          info: "!bg-sky-950/90 !border-sky-500/30",
        },
      }}
    />
  );
}

/**
 * Toast notification convenience wrapper
 *
 * Provides typed toast methods with consistent options.
 *
 * @example
 * showToast.success("Saved!", "Your changes have been saved");
 * showToast.error("Error", "Something went wrong");
 * showToast.promise(apiCall(), {
 *   loading: "Saving...",
 *   success: "Saved!",
 *   error: "Error saving",
 * });
 */
export const showToast = {
  /** Success notification */
  success: (title: string, description?: string) => {
    toast.success(title, { description, dismissible: true });
  },
  /** Error notification */
  error: (title: string, description?: string) => {
    toast.error(title, { description, dismissible: true });
  },
  /** Warning notification */
  warning: (title: string, description?: string) => {
    toast.warning(title, { description, dismissible: true });
  },
  /** Info notification */
  info: (title: string, description?: string) => {
    toast.info(title, { description, dismissible: true });
  },
  /** Loading notification (returns ID for updating) */
  loading: (title: string, description?: string) => {
    return toast.loading(title, { description, dismissible: true });
  },
  /** Promise-based notification for async operations */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },
};
