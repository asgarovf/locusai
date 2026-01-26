"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const tools = [
  { name: "Claude", src: "/tools/claude.png", width: "w-32" },
  { name: "Codex", src: "/tools/codex.png", width: "w-28" },
  { name: "VS Code", src: "/tools/vscode.png", width: "w-12" },
  { name: "Cursor", src: "/tools/cursor.png", width: "w-32" },
  { name: "Antigravity", src: "/tools/antigravity.png", width: "w-40" },
  { name: "Windsurf", src: "/tools/windsurf.png", width: "w-32" },
];

export function SupportedTools() {
  return (
    <section className="py-12 border-y border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden">
      <div className="container px-4 mx-auto mb-8 text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Supported Integrations
        </p>
      </div>

      <div className="flex overflow-hidden">
        <motion.div
          className="flex gap-20 items-center flex-nowrap"
          animate={{
            x: ["-50%", "0%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 40,
              ease: "linear",
            },
          }}
        >
          {/* Duplicate enough times to ensure smooth loop */}
          {[...tools, ...tools, ...tools, ...tools, ...tools, ...tools].map(
            (tool, i) => (
              <div
                key={i}
                className={`relative h-10 ${tool.width} shrink-0 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer`}
              >
                <Image
                  src={tool.src}
                  alt={tool.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100px, 200px"
                />
              </div>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
