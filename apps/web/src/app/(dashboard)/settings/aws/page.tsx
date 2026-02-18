"use client";

import { Info } from "lucide-react";
import { Suspense } from "react";
import { AwsCredentialsForm } from "@/components/aws/AwsCredentialsForm";
import { PageLayout } from "@/components/PageLayout";
import { Spinner } from "@/components/ui";

function AwsSettingsContent() {
  return (
    <PageLayout
      title="AWS Connection"
      description="Connect your AWS account to provision and manage agent servers."
    >
      <div className="max-w-3xl space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect your AWS account to provision and manage agent servers. Locus
          provisions instances in your AWS account — you pay AWS directly for
          compute costs.
        </p>

        <AwsCredentialsForm />

        <div className="bg-secondary/30 border border-border/50 rounded-2xl p-5">
          <div className="flex gap-3">
            <Info
              size={18}
              className="text-muted-foreground shrink-0 mt-0.5"
            />
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Required IAM Permissions
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Your IAM user needs the following EC2 permissions:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 font-mono">
                <li>ec2:RunInstances</li>
                <li>ec2:TerminateInstances</li>
                <li>ec2:DescribeInstances</li>
                <li>ec2:StartInstances</li>
                <li>ec2:StopInstances</li>
                <li>ec2:CreateTags</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function AwsSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      }
    >
      <AwsSettingsContent />
    </Suspense>
  );
}
