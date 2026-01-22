"use client";

import { getTypographyClass } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageLayout({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PageLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <div className="flex-none pb-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className={cn(getTypographyClass("h1"), "text-foreground/90")}>
              {title}
            </h1>
            {description && (
              <div className={cn(getTypographyClass("caption"), "mt-1")}>
                {description}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
      <div
        className={cn("flex-1 overflow-y-auto pb-12 mt-4", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
