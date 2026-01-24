"use client";

import { type Task } from "@locusai/shared";
import { FileText, Link, Plus, Trash2, X } from "lucide-react";
import NextLink from "next/link";
import { useState } from "react";
import { useDocsQuery } from "@/hooks/useDocsQuery";
import { cn } from "@/lib/utils";
import {
  EmptyStateText,
  MetadataText,
  SecondaryText,
  SectionLabel,
} from "../typography";
import { Button } from "../ui";

interface TaskDocsProps {
  /** Task to manage documents for */
  task: Task;
  /** Called when linking a document */
  onLinkDoc: (docId: string) => void;
  /** Called when unlinking a document */
  onUnlinkDoc: (docId: string) => void;
}

/**
 * Task Docs Component
 *
 * Displays and manages linked documentation for a task.
 * Allows linking/unlinking documents from the knowledge base.
 * Uses standardized typography components for consistent text styling.
 *
 * @component
 */
export function TaskDocs({ task, onLinkDoc, onUnlinkDoc }: TaskDocsProps) {
  const [isLinking, setIsLinking] = useState(false);
  const { data: allDocs = [] } = useDocsQuery();

  const linkedDocs =
    (task as Task & { docs: { id: string; title: string }[] }).docs || [];
  const linkedDocIds = linkedDocs.map((d: { id: string }) => d.id);
  const availableDocs = allDocs.filter((d) => !linkedDocIds.includes(d.id));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <SectionLabel as="h3">Knowledge base</SectionLabel>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsLinking(!isLinking)}
          className={cn(
            "h-7 px-2 text-[9px] font-black uppercase tracking-widest gap-1.5 transition-all rounded-lg",
            isLinking
              ? "bg-primary/20 text-primary"
              : "hover:bg-primary/10 hover:text-primary opacity-60 hover:opacity-100"
          )}
        >
          {isLinking ? <X size={12} /> : <Plus size={12} />}
          {isLinking ? "Cancel" : "Link Doc"}
        </Button>
      </div>

      {isLinking && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl animate-in zoom-in-95 duration-200">
          <SectionLabel className="mb-2 px-1 text-primary">
            Available Docs
          </SectionLabel>
          {availableDocs.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
              {availableDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    onLinkDoc(doc.id);
                    setIsLinking(false);
                  }}
                  className="flex items-center gap-3 w-full p-2.5 text-xs font-bold rounded-xl bg-card border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <FileText
                    size={14}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                  />
                  <span className="flex-1 truncate uppercase tracking-tight opacity-80 group-hover:opacity-100 transition-opacity">
                    {doc.title}
                  </span>
                  <Link
                    size={12}
                    className="opacity-0 group-hover:opacity-40"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <SecondaryText size="xs" className="italic">
                No Unlinked Docs
              </SecondaryText>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 px-1">
        {linkedDocs.length > 0
          ? linkedDocs.map((doc: { id: string; title: string }) => (
              <NextLink
                key={doc.id}
                href={`/docs?docId=${doc.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/20 border border-border/20 hover:border-primary/40 hover:bg-secondary/30 transition-all group relative"
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-wider text-foreground/90 truncate">
                    {doc.title}
                  </div>
                  <MetadataText size="xs">
                    Document ID: {doc.id.split("-")[0]}
                  </MetadataText>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUnlinkDoc(doc.id);
                  }}
                  className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 size={14} />
                </button>
              </NextLink>
            ))
          : !isLinking && (
              <EmptyStateText icon={<Link size={24} />}>
                No Linked Documents
              </EmptyStateText>
            )}
      </div>
    </div>
  );
}
