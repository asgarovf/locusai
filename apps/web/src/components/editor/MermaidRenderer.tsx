"use client";

import { generateUUID } from "@locusai/shared";
import parse from "html-react-parser";
import mermaid from "mermaid";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Initialize mermaid once outside the component
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "var(--font-mono)",
});

interface MermaidRendererProps {
  content: string;
  className?: string;
}

export function MermaidRenderer({ content, className }: MermaidRendererProps) {
  const [rendered, setRendered] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Generate a stable ID for this diagram
  const chartId = useMemo(() => `mermaid-${generateUUID()}`, []);

  useEffect(() => {
    if (!content) return;

    const renderDiagram = async () => {
      setIsRendering(true);
      try {
        // Re-initialize for safety or environment changes
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-mono)",
        });

        const { svg } = await mermaid.render(chartId, content);
        setRendered(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to render diagram. Check syntax."
        );
      } finally {
        setIsRendering(false);
      }
    };

    const timer = setTimeout(renderDiagram, 50);
    return () => clearTimeout(timer);
  }, [content, chartId]);

  return (
    <div className={cn("my-8 relative group", className)}>
      <div className="absolute -top-3 left-4 bg-primary/80 backdrop-blur-md text-primary-foreground text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full z-10 shadow-xl border border-primary/20">
        Mermaid Analysis
      </div>

      <div
        className={cn(
          "p-10 rounded-3xl bg-secondary/5 border-2 border-dashed border-border/20 flex flex-col items-center justify-center overflow-auto min-h-[180px] transition-all duration-500",
          error
            ? "border-destructive/30 bg-destructive/5"
            : "hover:border-primary/30 hover:bg-secondary/10"
        )}
      >
        {isRendering && !rendered && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 animate-pulse">
              Synthesizing Engine...
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center gap-4 text-center max-w-md animate-in fade-in zoom-in duration-300">
            <div className="text-[10px] font-mono p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 w-full overflow-auto whitespace-pre-wrap shadow-inner">
              {error}
            </div>
            <div className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em] font-black">
              Syntax Logic Fault
            </div>
          </div>
        ) : (
          rendered && (
            <div className="w-full flex justify-center py-4 animate-in fade-in scale-in duration-500">
              {parse(rendered)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
