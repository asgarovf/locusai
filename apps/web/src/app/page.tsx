"use client";

import dynamic from "next/dynamic";

const Board = dynamic(() => import("@/views/Board").then((mod) => mod.Board), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  ),
});

export default function Home() {
  return <Board />;
}
