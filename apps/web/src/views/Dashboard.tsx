"use client";

import type { Event, EventPayload } from "@locusai/shared";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Plus,
  Rocket,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, LoadingPage } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";

interface WorkspaceStats {
  taskCounts: Record<string, number>;
  memberCount: number;
  workspaceName: string;
}

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [activity, setActivity] = useState<Event[]>([]);
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

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background/50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in{" "}
            <span className="text-primary font-medium">
              {stats?.workspaceName || "your workspace"}
            </span>{" "}
            today.
          </p>
        </div>

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

        {/* Quick Actions & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Activity size={20} className="text-primary" />
                  Recent Activity
                </h3>
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {activity.length > 0 ? (
                  activity.map((event) => (
                    <ActivityItem key={event.id} event={event} />
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground italic text-sm">
                    No recent activity in this workspace.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Plus size={20} className="text-primary" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 rounded-xl"
                  onClick={() => router.push("/backlog?createTask=true")}
                >
                  <Plus size={18} />
                  New Task
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 rounded-xl"
                  onClick={() => router.push("/backlog?createSprint=true")}
                >
                  <Clock size={18} />
                  Start Sprint
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-12 rounded-xl"
                  onClick={() => router.push("/settings/team")}
                >
                  <Users size={18} />
                  Invite Team
                </Button>
              </div>
            </div>

            <div className="bg-linear-to-br from-primary/10 to-purple-500/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <BarChart3 size={20} className="text-primary" />
                AI Insights
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your team is 15% more productive this week. Consider moving
                "Database Migration" to the next sprint.
              </p>
              <Button size="sm" className="w-full">
                Ask Locus AI
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend: string;
  color: "primary" | "warning" | "success" | "purple";
}) {
  const colors = {
    primary: "text-primary bg-primary/10",
    warning: "text-amber-500 bg-amber-500/10",
    success: "text-emerald-500 bg-emerald-500/10",
    purple: "text-purple-500 bg-purple-500/10",
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-medium border-border/50"
        >
          {trend}
        </Badge>
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{title}</div>
      </div>
    </div>
  );
}

function ActivityItem({ event }: { event: Event }) {
  const { user } = useAuth();
  const { type, payload } = event;

  const getEventConfig = () => {
    switch (type) {
      case "TASK_CREATED": {
        const p = payload as Extract<
          EventPayload,
          { type: "TASK_CREATED" }
        >["payload"];
        return {
          icon: Plus,
          color: "text-emerald-500",
          action: "created task",
          target: p.title,
        };
      }
      case "STATUS_CHANGED": {
        const p = payload as Extract<
          EventPayload,
          { type: "STATUS_CHANGED" }
        >["payload"];
        return {
          icon: Activity,
          color: "text-primary",
          action: `moved task to ${p.newStatus}`,
          target: p.title,
        };
      }
      case "COMMENT_ADDED": {
        const p = payload as Extract<
          EventPayload,
          { type: "COMMENT_ADDED" }
        >["payload"];
        return {
          icon: MessageSquare,
          color: "text-blue-500",
          action: "commented on task",
          target: p.title,
        };
      }
      case "WORKSPACE_CREATED": {
        const p = payload as Extract<
          EventPayload,
          { type: "WORKSPACE_CREATED" }
        >["payload"];
        return {
          icon: Rocket,
          color: "text-purple-500",
          action: "created the workspace",
          target: p.name,
        };
      }
      case "MEMBER_INVITED": {
        const p = payload as Extract<
          EventPayload,
          { type: "MEMBER_INVITED" }
        >["payload"];
        return {
          icon: UserPlus,
          color: "text-amber-500",
          action: `invited ${p.email}`,
          target: "",
        };
      }
      case "SPRINT_CREATED": {
        const p = payload as Extract<
          EventPayload,
          { type: "SPRINT_CREATED" }
        >["payload"];
        return {
          icon: Clock,
          color: "text-primary",
          action: "created sprint",
          target: p.name,
        };
      }
      case "SPRINT_STATUS_CHANGED": {
        const p = payload as Extract<
          EventPayload,
          { type: "SPRINT_STATUS_CHANGED" }
        >["payload"];
        return {
          icon: Rocket,
          color: "text-orange-500",
          action: `moved sprint to ${p.newStatus}`,
          target: p.name,
        };
      }
      default:
        return {
          icon: Activity,
          color: "text-muted-foreground",
          action: type,
          target: "",
        };
    }
  };

  const config = getEventConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-3 hover:bg-secondary/20 rounded-xl transition-colors group">
      <div className={`p-2 rounded-lg bg-secondary/50 ${config.color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-foreground/90">
            {event.userId === user?.id ? "You" : "Team member"}
          </span>{" "}
          <span className="text-muted-foreground">{config.action}</span>{" "}
          {config.target && (
            <span className="font-medium text-primary cursor-pointer hover:underline">
              {config.target}
            </span>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
