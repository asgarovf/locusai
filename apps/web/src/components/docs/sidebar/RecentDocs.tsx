/**
 * Recent Docs Component
 *
 * Displays a list of recently accessed documents for quick access.
 */

"use client";

import type { Doc } from "@locusai/shared";
import { Clock, FileText } from "lucide-react";
import { SectionLabel } from "@/components/typography";
import { cn } from "@/lib/utils";

interface RecentDocsProps {
  docs: Doc[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  maxItems?: number;
}

export function RecentDocs({
  docs,
  selectedId,
  onSelect,
  maxItems = 5,
}: RecentDocsProps) {
  // Sort by updatedAt and take the most recent
  const recentDocs = [...docs]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, maxItems);

  if (recentDocs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1 text-muted-foreground/70">
        <Clock size={12} />
        <SectionLabel className="m-0 text-[10px]">Recent</SectionLabel>
      </div>
      <div className="space-y-0.5">
        {recentDocs.map((doc) => (
          <button
            key={doc.id}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
              selectedId === doc.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/70 hover:bg-secondary/50 hover:text-foreground"
            )}
            onClick={() => onSelect(doc.id)}
          >
            <FileText size={12} className="shrink-0 opacity-60" />
            <span className="truncate capitalize">
              {doc.title.replace(/[-_]/g, " ")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
