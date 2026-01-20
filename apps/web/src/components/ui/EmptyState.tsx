"use client";

import { motion } from "framer-motion";
import { type LucideIcon, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "compact" | "minimal";
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className
        )}
      >
        <Icon size={24} className="text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground/60 font-medium">{title}</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 text-center bg-secondary/10 rounded-xl border border-dashed border-border/50",
          className
        )}
      >
        <Icon size={20} className="text-primary/40 mb-2" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center",
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-secondary to-secondary/30 border border-border/50">
          <Icon size={32} className="text-primary/60" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="max-w-[300px] text-sm text-muted-foreground mb-8 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
