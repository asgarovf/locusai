"use client";

import { type InstanceInfo } from "@locusai/sdk";
import { InstanceAction, InstanceStatus } from "@locusai/shared";
import {
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Play,
  RefreshCw,
  Server,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Modal, showToast } from "@/components/ui";
import { useInstanceAction, useSyncInstance } from "@/hooks/useAwsInstances";
import { cn } from "@/lib/utils";

interface InstanceCardProps {
  instance: InstanceInfo;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "success" | "warning" | "default" | "error" | "info";
    dotColor: string;
  }
> = {
  [InstanceStatus.RUNNING]: {
    label: "Running",
    variant: "success",
    dotColor: "bg-emerald-500",
  },
  [InstanceStatus.PROVISIONING]: {
    label: "Provisioning",
    variant: "warning",
    dotColor: "bg-amber-500",
  },
  [InstanceStatus.STOPPED]: {
    label: "Stopped",
    variant: "default",
    dotColor: "bg-gray-400",
  },
  [InstanceStatus.ERROR]: {
    label: "Error",
    variant: "error",
    dotColor: "bg-red-500",
  },
  [InstanceStatus.TERMINATED]: {
    label: "Terminated",
    variant: "error",
    dotColor: "bg-red-500",
  },
};

const INSTANCE_TYPE_LABELS: Record<string, string> = {
  "t3.micro": "t3.micro (~$8/mo)",
  "t3.small": "t3.small (~$15/mo)",
  "t3.medium": "t3.medium (~$30/mo)",
};

function getRelativeTime(date: string | Date | null): string {
  if (!date) return "N/A";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function InstanceCard({ instance }: InstanceCardProps) {
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const instanceAction = useInstanceAction();
  const syncInstance = useSyncInstance();

  const statusConfig = STATUS_CONFIG[instance.status] ?? {
    label: instance.status,
    variant: "default" as const,
    dotColor: "bg-gray-400",
  };

  const isRunning = instance.status === InstanceStatus.RUNNING;
  const isStopped = instance.status === InstanceStatus.STOPPED;
  const isTerminated = instance.status === InstanceStatus.TERMINATED;
  const isProvisioning = instance.status === InstanceStatus.PROVISIONING;
  const isActionPending = instanceAction.isPending;

  const handleCopyIp = () => {
    if (instance.publicIp) {
      navigator.clipboard.writeText(instance.publicIp);
      showToast.success("IP address copied");
    }
  };

  const handleAction = (action: InstanceAction) => {
    instanceAction.mutate({ instanceId: instance.id, action });
  };

  const handleTerminate = () => {
    handleAction(InstanceAction.TERMINATE);
    setShowTerminateConfirm(false);
  };

  const repoName = instance.repoUrl
    ? instance.repoUrl
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\.git$/, "")
    : null;

  return (
    <>
      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isRunning
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-secondary"
              )}
            >
              <Server
                size={18}
                className={
                  isRunning ? "text-emerald-500" : "text-muted-foreground"
                }
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                {repoName || "Instance"}
              </div>
              <div className="text-xs text-muted-foreground">
                {instance.region}
              </div>
            </div>
          </div>
          <Badge variant={statusConfig.variant} size="sm">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full mr-1.5",
                statusConfig.dotColor,
                isProvisioning && "animate-pulse"
              )}
            />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type</span>
            <span className="text-foreground font-medium">
              {INSTANCE_TYPE_LABELS[instance.instanceType] ??
                instance.instanceType}
            </span>
          </div>

          {instance.publicIp && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Globe size={13} />
                IP
              </span>
              <button
                onClick={handleCopyIp}
                className="flex items-center gap-1.5 text-foreground font-mono text-xs hover:text-primary transition-colors"
                title="Copy IP address"
              >
                {instance.publicIp}
                <Copy size={12} className="text-muted-foreground" />
              </button>
            </div>
          )}

          {repoName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Repo</span>
              <a
                href={instance.repoUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-foreground hover:text-primary transition-colors truncate max-w-[180px]"
              >
                <span className="truncate text-xs">{repoName}</span>
                <ExternalLink
                  size={11}
                  className="shrink-0 text-muted-foreground"
                />
              </a>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock size={13} />
              Launched
            </span>
            <span className="text-foreground text-xs">
              {getRelativeTime(instance.launchedAt)}
            </span>
          </div>

          {instance.errorMessage && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
              <AlertTriangle
                size={14}
                className="text-red-500 shrink-0 mt-0.5"
              />
              <span className="text-xs text-red-400 line-clamp-2">
                {instance.errorMessage}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/30">
          {isStopped && (
            <Button
              variant="emerald"
              size="sm"
              onClick={() => handleAction(InstanceAction.START)}
              disabled={isActionPending}
            >
              <Play size={14} />
              Start
            </Button>
          )}
          {isRunning && (
            <>
              <Button
                variant="amber"
                size="sm"
                onClick={() => handleAction(InstanceAction.STOP)}
                disabled={isActionPending}
              >
                <Square size={14} />
                Stop
              </Button>
              <Link href={`/hosting/${instance.id}/terminal`}>
                <Button variant="outline" size="sm">
                  <Terminal size={14} />
                  Terminal
                </Button>
              </Link>
            </>
          )}
          {!isTerminated && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowTerminateConfirm(true)}
              disabled={isActionPending}
              className="ml-auto"
            >
              <Trash2 size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncInstance.mutate({ instanceId: instance.id })}
            disabled={syncInstance.isPending}
            title="Sync status"
          >
            <RefreshCw
              size={14}
              className={cn(syncInstance.isPending && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Terminate Confirmation Modal */}
      <Modal
        isOpen={showTerminateConfirm}
        onClose={() => setShowTerminateConfirm(false)}
        title="Terminate Instance"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to terminate this instance? This action cannot
            be undone and will permanently destroy the EC2 instance.
          </p>
          {repoName && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
              <span className="text-sm font-mono text-foreground">
                {repoName}
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTerminateConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleTerminate}
              isLoading={isActionPending}
              loadingText="Terminating..."
            >
              <Trash2 size={14} />
              Terminate
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
