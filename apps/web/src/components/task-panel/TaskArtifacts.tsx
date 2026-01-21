"use client";

import { type Task } from "@locusai/shared";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui";

interface TaskArtifactsProps {
  task: Task;
}

export function TaskArtifacts({ task }: TaskArtifactsProps) {
  return (
    <div className="mb-10">
      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 mb-6 pb-2 border-b border-border/40">
        Output Pipeline
      </h4>
      <div className="grid gap-3">
        {task.artifacts.length > 0 ? (
          task.artifacts.map((artifact) => (
            <a
              key={artifact.id}
              href={artifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-4 bg-background/40 border border-border/30 rounded-2xl hover:border-primary/50 hover:bg-background transition-all duration-300 shadow-sm"
            >
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 border border-primary/5">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-black truncate text-foreground/90 tracking-wide">
                  {artifact.title}
                </span>
                <span className="text-[9px] text-muted-foreground/50 font-black uppercase tracking-widest mt-1.5 block">
                  {artifact.type} • {artifact.size}
                </span>
              </div>
            </a>
          ))
        ) : (
          <EmptyState
            variant="minimal"
            title="Draft Phase"
            className="py-10 border-dashed border-2 border-border/30 rounded-2xl opacity-40"
          />
        )}
      </div>
    </div>
  );
}
