"use client";

import { motion } from "framer-motion";

function WireframeCube({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-labelledby="wireframe-cube-title"
    >
      <title id="wireframe-cube-title">Wireframe Cube</title>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </svg>
  );
}

export function BrandingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Large Floating Cube - Left */}
      <motion.div
        className="absolute -left-10 top-10 md:-left-20 md:top-20 text-foreground/5"
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0, rotate: 360 }}
        transition={{
          duration: 1,
          ease: "easeOut",
          rotate: { duration: 120, repeat: Infinity, ease: "linear" },
        }}
      >
        <WireframeCube className="w-48 h-48 md:w-96 md:h-96" />
      </motion.div>

      {/* Large Floating Cube - Right */}
      <motion.div
        className="absolute -right-10 bottom-10 md:-right-20 md:bottom-20 text-foreground/5"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0, rotate: -360 }}
        transition={{
          duration: 1,
          ease: "easeOut",
          rotate: { duration: 150, repeat: Infinity, ease: "linear" },
        }}
      >
        <WireframeCube className="w-64 h-64 md:w-[500px] md:h-[500px]" />
      </motion.div>

      {/* subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size[4rem_4rem]mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
}
