"use client";

import { type Event as WorkspaceEvent } from "@locusai/shared";
import { CheckCircle2, Clock, LayoutDashboard, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageLayout } from "@/components/PageLayout";
import { LoadingPage } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";

interface WorkspaceStats {
  taskCounts: Record<string, number>;
  memberCount: number;
  workspaceName: string;
}

export function Dashboard() {
  const { user } = useAuth();
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
      <div className="max-w-6xl mx-auto space-y-8 pt-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tasks"
            value={totalTasks}
            icon={LayoutDashboard}
            trend="+0 since yesterday"
            color="primary"
          />
          <StatCard
            title="In Progress"
            value={inProgressTasks}
            icon={Clock}
            trend="Needs attention"
            color="warning"
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
          <StatCard
            title="Team Members"
            value={stats?.memberCount || 0}
            icon={Users}
            trend="Active now"
            color="purple"
          />
        </div>

        {/* Feed & Quick Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ActivityFeed activity={activity} />
          </div>

          <div className="space-y-6">
            <QuickActions />
            <AIInsights />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
