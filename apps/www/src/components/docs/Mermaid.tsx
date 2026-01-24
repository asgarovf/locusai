"use client";

import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
  flowchart: {
    htmlLabels: true,
    curve: "basis",
  },
});

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Use a stable ID for hydration matches, but unique enough for multiple charts
  const idRef = useRef("");

  useEffect(() => {
    setIsClient(true);
    idRef.current = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  useEffect(() => {
    if (!isClient || !chart || !containerRef.current) return;

    const renderChart = async () => {
      try {
        // Clear any previous error
        setError(null);

        // Render the chart
        const { svg } = await mermaid.render(idRef.current, chart);

        // Check if ref still exists (component might be unmounted)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Failed to render mermaid chart", err);
        // Mermaid throws a string effectively sometimes, but let's be safe
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    renderChart();
  }, [chart, isClient]);

  if (!isClient) {
    return <div className="animate-pulse h-32 bg-white/5 rounded-lg my-8" />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm my-6">
        <p className="font-semibold mb-2">Failed to render diagram</p>
        <pre className="whitespace-pre-wrap overflow-x-auto">{error}</pre>
        <pre className="mt-4 text-xs text-white/50 border-t border-white/10 pt-2">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center my-8 p-6 rounded-xl bg-[#0d1117] border border-white/10 overflow-x-auto"
    />
  );
}
