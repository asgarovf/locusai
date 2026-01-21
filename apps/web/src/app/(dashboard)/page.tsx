"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";

const Dashboard = dynamic(
  () => import("@/views/Dashboard").then((mod) => mod.Dashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" className="mx-auto" />
      </div>
    ),
  }
);

export default function Home() {
  return <Dashboard />;
}
