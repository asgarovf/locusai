"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(
  () => import("@/views/Dashboard").then((mod) => mod.Dashboard),
  {
    ssr: false,
  }
);

export default function Home() {
  return <Dashboard />;
}
