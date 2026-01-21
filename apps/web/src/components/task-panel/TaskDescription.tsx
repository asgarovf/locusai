"use client";

import { type Task } from "@locusai/shared";
import { Edit, FileText } from "lucide-react";
import { Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TaskDescriptionProps {
  task: Task;
  isEditingTitle: boolean;
  setIsEditingTitle: (val: boolean) => void;
  editTitle: string;
  setEditTitle: (val: string) => void;
  handleTitleSave: () => void;
  editDesc: string;
  setEditDesc: (val: string) => void;
  handleDescSave: () => void;
  descMode: "edit" | "preview";
  setDescMode: (mode: "edit" | "preview") => void;
}

export function TaskDescription({
  task,
  isEditingTitle,
  setIsEditingTitle,
  editTitle,
  setEditTitle,
  handleTitleSave,
  editDesc,
  setEditDesc,
  handleDescSave,
  descMode,
  setDescMode,
}: TaskDescriptionProps) {
  return (
    <div className="p-8 overflow-y-auto scrollbar-thin">
      {/* Title Section */}
      <div className="mb-8">
        {isEditingTitle ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") {
                setEditTitle(task.title);
                setIsEditingTitle(false);
              }
            }}
            className="text-3xl h-16 font-black tracking-tight bg-secondary/20 border-primary/20 rounded-2xl px-6"
            autoFocus
          />
        ) : (
          <h2
            className="text-3xl font-black tracking-tight hover:text-primary transition-all cursor-pointer leading-tight group flex items-start"
            onClick={() => setIsEditingTitle(true)}
          >
            {task.title}
            <Edit
              size={18}
              className="ml-4 mt-1.5 opacity-0 group-hover:opacity-40 transition-opacity"
            />
          </h2>
        )}
      </div>

      {/* Description Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              <FileText size={16} />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
              Technical Documentation
            </h4>
          </div>
          <div className="flex bg-secondary/40 p-1 rounded-xl border border-border/20 shadow-inner">
            <button
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                descMode === "preview"
                  ? "bg-background shadow-md text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setDescMode("preview")}
            >
              Visual
            </button>
            <button
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                descMode === "edit"
                  ? "bg-background shadow-md text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setDescMode("edit")}
            >
              Markdown
            </button>
          </div>
        </div>

        {descMode === "edit" ? (
          <div className="group border border-border/40 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-secondary/5 shadow-inner">
            <Textarea
              value={editDesc}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEditDesc(e.target.value)
              }
              placeholder="Define implementation architecture, requirements, and scope..."
              rows={12}
              className="border-none focus:ring-0 text-base leading-relaxed p-8 bg-transparent scrollbar-thin"
              onBlur={handleDescSave}
            />
          </div>
        ) : (
          <div className="prose prose-invert max-w-none bg-secondary/10 p-10 rounded-3xl border border-border/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] relative group">
            {task.description ? (
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                {task.description}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30 select-none">
                <FileText size={32} className="mb-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  Waiting for Specs
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
