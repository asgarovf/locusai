import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  children: React.ReactNode;
  title?: string;
  type?: "note" | "tip" | "important" | "warning" | "caution";
}

const styles = {
  note: {
    border: "border-blue-500/50",
    bg: "bg-blue-500/10",
    text: "text-blue-200",
    icon: Info,
    defaultTitle: "Note",
  },
  tip: {
    border: "border-green-500/50",
    bg: "bg-green-500/10",
    text: "text-green-200",
    icon: Lightbulb,
    defaultTitle: "Tip",
  },
  important: {
    border: "border-purple-500/50",
    bg: "bg-purple-500/10",
    text: "text-purple-200",
    icon: AlertCircle,
    defaultTitle: "Important",
  },
  warning: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/10",
    text: "text-yellow-200",
    icon: AlertTriangle,
    defaultTitle: "Warning",
  },
  caution: {
    border: "border-red-500/50",
    bg: "bg-red-500/10",
    text: "text-red-200",
    icon: AlertTriangle,
    defaultTitle: "Caution",
  },
};

export function Alert({ children, type = "note", title }: AlertProps) {
  const style = styles[type] || styles.note;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "my-6 rounded-lg border p-4 w-full",
        style.border,
        style.bg
      )}
    >
      <div className="flex items-start gap-4">
        <Icon className={cn("h-5 w-5 mt-1 shrink-0", style.text)} />
        <div className="text-sm prose-p:my-0 prose-p:leading-relaxed text-foreground/90 w-full min-w-0">
          {(title || style.defaultTitle) && (
            <p className={cn("font-medium mb-1", style.text)}>
              {title || style.defaultTitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// Convenience components
export const Note = (props: Omit<AlertProps, "type">) => (
  <Alert {...props} type="note" />
);
export const Tip = (props: Omit<AlertProps, "type">) => (
  <Alert {...props} type="tip" />
);
export const Important = (props: Omit<AlertProps, "type">) => (
  <Alert {...props} type="important" />
);
export const Warning = (props: Omit<AlertProps, "type">) => (
  <Alert {...props} type="warning" />
);
export const Caution = (props: Omit<AlertProps, "type">) => (
  <Alert {...props} type="caution" />
);
