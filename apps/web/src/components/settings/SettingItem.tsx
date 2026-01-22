"use client";

import React from "react";

export interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingItem({
  icon,
  title,
  description,
  children,
}: SettingItemProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl hover:bg-secondary/30 transition-colors">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0 flex items-center h-full">{children}</div>
    </div>
  );
}
