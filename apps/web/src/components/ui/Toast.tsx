"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

// Re-export toast for convenience
export { toast };

// Styled Toaster component for our theme
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
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

// Convenience wrapper for typed toast calls
export const showToast = {
  success: (title: string, description?: string) => {
    toast.success(title, { description });
  },
  error: (title: string, description?: string) => {
    toast.error(title, { description });
  },
  warning: (title: string, description?: string) => {
    toast.warning(title, { description });
  },
  info: (title: string, description?: string) => {
    toast.info(title, { description });
  },
  loading: (title: string, description?: string) => {
    return toast.loading(title, { description });
  },
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
