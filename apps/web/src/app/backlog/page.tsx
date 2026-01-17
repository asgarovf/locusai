"use client";

import dynamic from "next/dynamic";

const Backlog = dynamic(
  () => import("@/views/Backlog").then((mod) => mod.Backlog),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    ),
  }
);

export default function BacklogPage() {
  return <Backlog />;
}
