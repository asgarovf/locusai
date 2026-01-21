"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function SettingSection({
  title,
  children,
  className,
  titleClassName,
}: SettingSectionProps) {
  return (
    <div className={cn("mb-8", className)}>
      <h3
        className={cn(
          "text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-4",
          titleClassName
        )}
      >
        {title}
      </h3>
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}
