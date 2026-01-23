"use client";

import { motion } from "framer-motion";
import { Editor } from "@/components/Editor";

interface SprintMindmapProps {
  mindmap: string | null;
}

export function SprintMindmap({ mindmap }: SprintMindmapProps) {
  if (!mindmap) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
        <p className="text-lg font-medium text-foreground">
          No mindmap generated yet
        </p>
        <p className="text-sm opacity-70 max-w-xs text-center mt-2">
          The agent will analyze your sprint and generate a strategic mindmap
          once it starts working.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 relative min-h-[70vh] bg-[#09090b] rounded-xl border border-white/5 overflow-hidden"
    >
      {/* Canvas Grid Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, #3f3f46 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 p-8 md:p-12 h-full max-h-[80vh] overflow-hidden">
        <div className="max-w-5xl mx-auto h-full">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/50 h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <Editor
                value={mindmap}
                onChange={() => {
                  /* Read-only */
                }}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute top-6 right-6 z-20">
        <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold tracking-widest text-indigo-400 uppercase backdrop-blur-sm">
          Agent Strategy Core
        </div>
      </div>
    </motion.div>
  );
}
