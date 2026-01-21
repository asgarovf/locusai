"use client";

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
            <h1 className="text-3xl font-bold tracking-tight text-foreground/90">
              {title}
            </h1>
            {description && (
              <div className="text-sm text-muted-foreground mt-1 font-medium">
                {description}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
      <div
        className={cn("flex-1 overflow-y-auto px-6 pb-12", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
