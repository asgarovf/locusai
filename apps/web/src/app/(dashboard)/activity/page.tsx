"use client";

import { Suspense } from "react";
import { LoadingPage } from "@/components/ui";
import { ActivityView } from "@/views/ActivityView";

export default function ActivityPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ActivityView />
    </Suspense>
  );
}
