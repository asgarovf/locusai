"use client";

import { type Event as WorkspaceEvent } from "@locusai/shared";
import { CheckCircle2, Clock, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { PageLayout } from "@/components";
import {
  ActivityFeed,
  QuickActions,
  StatCard,
  WorkspaceSetup,
} from "@/components/dashboard";
import { LoadingPage } from "@/components/ui";
import { useAuthenticatedUser } from "@/hooks";
import { locusClient } from "@/lib/api-client";

interface WorkspaceStats {
  taskCounts: Record<string, number>;
  memberCount: number;
  workspaceName: string;
}

export function Dashboard() {
  const user = useAuthenticatedUser();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [activity, setActivity] = useState<WorkspaceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.workspaceId) {
        setLoading(false);
        return;
      }
      try {
        const [statsData, activityData] = await Promise.all([
          locusClient.workspaces.getStats(user.workspaceId),
          locusClient.workspaces.getActivity(user.workspaceId),
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.workspaceId]);

  if (loading) {
    return <LoadingPage />;
  }

  const totalTasks = Object.values(stats?.taskCounts || {}).reduce(
    (a, b) => a + b,
    0
  );
  const doneTasks = stats?.taskCounts?.DONE || 0;
  const inProgressTasks = stats?.taskCounts?.IN_PROGRESS || 0;
  const verificationTasks = stats?.taskCounts?.VERIFICATION || 0;
  const backlogTasks = stats?.taskCounts?.BACKLOG || 0;

  const welcomeTitle = `Welcome back, ${user?.name.split(" ")[0]}!`;
  const welcomeDesc = (
    <>
      Here's what's happening in{" "}
      <span className="text-primary font-medium">
        {stats?.workspaceName || "your workspace"}
      </span>{" "}
      today.
    </>
  );

  return (
    <PageLayout title={welcomeTitle} description={welcomeDesc}>
      <div className="max-w-7xl mx-auto space-y-8 pt-4">
        {/* Workspace Quick Info & Setup */}
        {user?.workspaceId && <WorkspaceSetup workspaceId={user.workspaceId} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tasks"
            value={totalTasks}
            icon={LayoutDashboard}
            trend={`${backlogTasks} in backlog`}
            color="primary"
          />
          <StatCard
            title="In Progress"
            value={inProgressTasks}
            icon={Clock}
            trend={inProgressTasks > 5 ? "High workload" : "Manageable"}
            color="warning"
          />
          <StatCard
            title="Verification"
            value={verificationTasks}
            icon={CheckCircle2}
            trend={
              verificationTasks > 0
                ? `${verificationTasks} needs review`
                : "All clear"
            }
            color="purple"
          />
          <StatCard
            title="Completed"
            value={doneTasks}
            icon={CheckCircle2}
            trend={`${
              totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
            }% completion rate`}
            color="success"
          />
        </div>

        {/* Feed & Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <ActivityFeed activity={activity} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <QuickActions />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
