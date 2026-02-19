"use client";

import { InstanceStatus } from "@locusai/shared";
import { AlertTriangle, Plus, Server } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { InstanceCard } from "@/components/aws/InstanceCard";
import { ProvisionModal } from "@/components/aws/ProvisionModal";
import { PageLayout } from "@/components/PageLayout";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { useAwsCredentialsQuery } from "@/hooks/useAwsCredentials";
import { useAwsInstances } from "@/hooks/useAwsInstances";

export default function HostingPage() {
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const { data: instances = [], isLoading: instancesLoading } =
    useAwsInstances();
  const { data: credentials, isLoading: credentialsLoading } =
    useAwsCredentialsQuery();

  const isLoading = instancesLoading || credentialsLoading;
  const hasCredentials = !!credentials;

  const activeInstances = instances.filter(
    (i) => i.status !== InstanceStatus.TERMINATED
  );
  const terminatedInstances = instances.filter(
    (i) => i.status === InstanceStatus.TERMINATED
  );

  return (
    <PageLayout
      title="Hosting"
      description="Provision and manage your cloud instances"
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsProvisionOpen(true)}
          disabled={!hasCredentials}
        >
          <Plus size={16} />
          Provision Instance
        </Button>
      }
    >
      {/* AWS Credentials Banner */}
      {!isLoading && !hasCredentials && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              AWS credentials required
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your AWS account to start provisioning instances.
            </p>
          </div>
          <Link href="/settings/aws">
            <Button variant="amber" size="sm">
              Configure AWS
            </Button>
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : instances.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No instances yet"
          description={
            hasCredentials
              ? "Provision your first instance to deploy an agent."
              : "Configure AWS credentials first, then provision an instance."
          }
          action={
            hasCredentials ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsProvisionOpen(true)}
              >
                <Plus size={16} />
                Provision Instance
              </Button>
            ) : (
              <Link href="/settings/aws">
                <Button variant="primary" size="sm">
                  Configure AWS
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Active Instances */}
          {activeInstances.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeInstances.map((instance) => (
                <InstanceCard key={instance.id} instance={instance} />
              ))}
            </div>
          )}

          {/* Terminated Instances */}
          {terminatedInstances.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Terminated
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                {terminatedInstances.map((instance) => (
                  <InstanceCard key={instance.id} instance={instance} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ProvisionModal
        isOpen={isProvisionOpen}
        onClose={() => setIsProvisionOpen(false)}
      />
    </PageLayout>
  );
}
