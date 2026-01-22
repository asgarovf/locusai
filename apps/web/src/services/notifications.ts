/**
 * Notification Service
 *
 * Centralized notification/toast handling using Sonner.
 */

import { toast } from "sonner";
import { TIMING } from "@/lib/constants";

export type NotificationType =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info";

interface NotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a notification
 */
export function notify(
  message: string,
  type: NotificationType = "default",
  options?: NotificationOptions
) {
  const duration = options?.duration || TIMING.TOAST_DURATION_MS;

  const notificationProps = {
    duration,
    action: options?.action,
  };

  switch (type) {
    case "success":
      toast.success(message, notificationProps);
      break;
    case "error":
      toast.error(message, notificationProps);
      break;
    case "warning":
      toast(message, { ...notificationProps, icon: "⚠️" });
      break;
    case "info":
      toast.info?.(message, notificationProps) ||
        toast(message, notificationProps);
      break;
    default:
      toast(message, notificationProps);
  }
}

/**
 * Specific notification helpers
 */
export const notifications = {
  success: (message: string, options?: NotificationOptions) =>
    notify(message, "success", options),
  error: (message: string, options?: NotificationOptions) =>
    notify(message, "error", options),
  warning: (message: string, options?: NotificationOptions) =>
    notify(message, "warning", options),
  info: (message: string, options?: NotificationOptions) =>
    notify(message, "info", options),

  // Common use cases
  saved: () => notifications.success("Changes saved"),
  deleted: () => notifications.success("Deleted successfully"),
  created: (item: string) =>
    notifications.success(`${item} created successfully`),
  failed: (action: string) =>
    notifications.error(`Failed to ${action}. Please try again.`),
  loading: (message: string) => notify(message, "info"),
};
