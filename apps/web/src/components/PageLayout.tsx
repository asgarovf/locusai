/**
 * Page Layout Component
 *
 * Standard layout wrapper for content pages.
 * Provides consistent header, title, description, and content area.
 *
 * @example
 * <PageLayout
 *   title="Team Management"
 *   description="Manage your organization members"
 *   actions={<Button>Invite</Button>}
 * >
 *   <TeamList />
 * </PageLayout>
 */

"use client";

import { getTypographyClass } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  /** Page title */
  title: string;
  /** Page description or subtitle */
  description?: React.ReactNode;
  /** Action buttons/controls for header */
  actions?: React.ReactNode;
  /** Main page content */
  children: React.ReactNode;
  /** Optional className override */
  className?: string;
  /** Optional content className override */
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <h1 className={cn(getTypographyClass("h1"), "text-foreground/90")}>
              {title}
            </h1>
            {description && (
              <div className={cn(getTypographyClass("caption"), "mt-1")}>
                {description}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">{actions}</div>}
        </div>
      </div>
      <div
        className={cn("flex-1 overflow-y-auto pb-20 lg:pb-12 mt-4", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
