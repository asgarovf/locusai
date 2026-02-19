"use client";

import { InstanceStatus } from "@locusai/shared";
import { ArrowLeft, Globe, Server } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { WebTerminal } from "@/components/aws/WebTerminal";
import { Badge, Spinner } from "@/components/ui";
import { useAwsInstance } from "@/hooks/useAwsInstances";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

interface TerminalPageProps {
  params: Promise<{ instanceId: string }>;
}

export default function TerminalPage({ params }: TerminalPageProps) {
  const { instanceId } = use(params);
  const workspaceId = useWorkspaceId();
  const { data: instance, isLoading, error } = useAwsInstance(instanceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Server size={20} className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Instance not found
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The instance you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
        </div>
        <Link
          href="/hosting"
          className="text-sm text-primary hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to Hosting
        </Link>
      </div>
    );
  }

  if (instance.status !== InstanceStatus.RUNNING) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Server size={20} className="text-amber-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Instance must be running to open a terminal.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current status:{" "}
            <span className="font-medium text-foreground">
              {instance.status}
            </span>
          </p>
        </div>
        <Link
          href="/hosting"
          className="text-sm text-primary hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Back to Hosting
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link
            href="/hosting"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Server size={14} className="text-emerald-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Terminal
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {instance.publicIp && (
                  <span className="flex items-center gap-1">
                    <Globe size={11} />
                    {instance.publicIp}
                  </span>
                )}
                <Badge variant="success" size="sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  Running
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <Link
          href="/hosting"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Hosting
        </Link>
      </div>

      {/* Terminal */}
      <div className="flex-1 min-h-0">
        <WebTerminal workspaceId={workspaceId} instanceId={instanceId} />
      </div>
    </div>
  );
}
