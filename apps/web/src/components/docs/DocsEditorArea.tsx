/**
 * Docs Editor Area Component
 *
 * Enhanced editor area with:
 * - Modern empty state with quick start cards
 * - Table of contents sidebar
 * - Edit and preview modes
 *
 * @example
 * <DocsEditorArea
 *   selectedDoc={doc}
 *   content={content}
 *   onContentChange={handleChange}
 *   contentMode="edit"
 *   onCreateWithTemplate={handleCreate}
 * />
 */

"use client";

import { type Doc } from "@locusai/shared";
import { List } from "lucide-react";
import { useState } from "react";
import { Editor } from "@/components/Editor";
import { SecondaryText } from "@/components/typography";
import { cn } from "@/lib/utils";
import { DocsEmptyState } from "./DocsEmptyState";
import { TableOfContents } from "./TableOfContents";

interface DocsEditorAreaProps {
  /** Selected documentation file */
  selectedDoc: Doc | null;
  /** Current content being edited */
  content: string;
  /** Called when content changes */
  onContentChange: (content: string) => void;
  /** Edit or preview mode */
  contentMode: "edit" | "preview";
  /** Called to create new doc with template */
  onCreateWithTemplate: (templateId: string) => void;
}

export function DocsEditorArea({
  selectedDoc,
  content,
  onContentChange,
  contentMode,
  onCreateWithTemplate,
}: DocsEditorAreaProps) {
  const [showToc, setShowToc] = useState(true);

  if (!selectedDoc) {
    return (
      <div className="h-full bg-secondary/5 border border-dashed border-border/40 rounded-3xl overflow-hidden">
        <DocsEmptyState onCreateWithTemplate={onCreateWithTemplate} />
      </div>
    );
  }

  // Check if content has enough headings to show TOC
  const hasHeadings = /^#{1,3}\s+/m.test(content);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Main Editor */}
        <div className="flex-1 bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/5 relative group">
          <Editor
            value={content}
            onChange={onContentChange}
            readOnly={contentMode === "preview"}
          />
          {contentMode === "preview" && (
            <div className="absolute top-4 right-4 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
              <SecondaryText size="xs" className="text-muted-foreground/20">
                Preview Mode
              </SecondaryText>
            </div>
          )}
        </div>

        {/* Table of Contents Sidebar */}
        {hasHeadings && showToc && (
          <div className="shrink-0 animate-in slide-in-from-right-4 duration-300">
            <TableOfContents
              content={content}
              onClose={() => setShowToc(false)}
              collapsible
            />
          </div>
        )}

        {/* TOC Toggle Button (when collapsed) */}
        {hasHeadings && !showToc && (
          <button
            onClick={() => setShowToc(true)}
            className={cn(
              "shrink-0 p-2.5 h-fit rounded-xl bg-card/30 backdrop-blur-sm border border-border/40",
              "hover:bg-card/50 transition-colors animate-in fade-in duration-200"
            )}
            title="Show Table of Contents"
          >
            <List size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
