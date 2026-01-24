/**
 * Docs Editor Area Component
 *
 * Displays the main editor for documentation files.
 * Supports edit and preview modes with rich text editing.
 *
 * @example
 * <DocsEditorArea
 *   selectedDoc={doc}
 *   content={content}
 *   onContentChange={handleChange}
 *   contentMode="edit"
 *   onNewDoc={handleCreate}
 * />
 */

"use client";

import { type Doc } from "@locusai/shared";
import { BookOpen, Plus } from "lucide-react";
import { Editor } from "@/components/Editor";
import { SecondaryText } from "@/components/typography";
import { Button, EmptyState } from "@/components/ui";

interface DocsEditorAreaProps {
  /** Selected documentation file */
  selectedDoc: Doc | null;
  /** Current content being edited */
  content: string;
  /** Called when content changes */
  onContentChange: (content: string) => void;
  /** Edit or preview mode */
  contentMode: "edit" | "preview";
  /** Called to create new doc */
  onNewDoc: () => void;
}

export function DocsEditorArea({
  selectedDoc,
  content,
  onContentChange,
  contentMode,
  onNewDoc,
}: DocsEditorAreaProps) {
  if (!selectedDoc) {
    return (
      <div className="h-full flex items-center justify-center p-12 bg-secondary/5 border border-dashed border-border/40 rounded-3xl group transition-all hover:bg-secondary/10">
        <EmptyState
          icon={BookOpen}
          title="Documentation Nexus"
          description="Access the collective engineering intelligence. Forge new product requirements, architectural designs, or team processes."
          action={
            <Button
              variant="secondary"
              size="sm"
              className="h-11 px-8 font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg border-border/40"
              onClick={onNewDoc}
            >
              <Plus size={16} className="mr-2" />
              New Document
            </Button>
          }
          className="max-w-xl scale-110 group-hover:scale-[1.12] transition-transform duration-500"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex-1 bg-card/20 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-black/5 relative group">
        <Editor
          value={content}
          onChange={onContentChange}
          readOnly={contentMode === "preview"}
        />
        {contentMode === "preview" && (
          <div className="absolute top-4 right-4 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity">
            <SecondaryText size="xs" className="text-muted-foreground/20">
              Vision Mode Only
            </SecondaryText>
          </div>
        )}
      </div>
    </div>
  );
}
