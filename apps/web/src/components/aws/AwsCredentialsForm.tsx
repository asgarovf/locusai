"use client";

import { Eye, EyeOff, KeyRound, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Dropdown, Input } from "@/components/ui";
import {
  useAwsCredentialsQuery,
  useDeleteAwsCredentials,
  useSaveAwsCredentials,
} from "@/hooks/useAwsCredentials";

const REGION_OPTIONS = [
  { value: "us-east-1" as const, label: "US East (N. Virginia) — us-east-1" },
];

export function AwsCredentialsForm() {
  const { data: credential, isLoading, error } = useAwsCredentialsQuery();
  const saveMutation = useSaveAwsCredentials();
  const deleteMutation = useDeleteAwsCredentials();

  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState<string>("us-east-1");
  const [showSecret, setShowSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const hasExistingCredentials =
    !!credential && !(error instanceof Error && error.name === "HTTP404");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyId.trim() || !secretAccessKey.trim()) return;

    saveMutation.mutate(
      {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        region,
      },
      {
        onSuccess: () => {
          setAccessKeyId("");
          setSecretAccessKey("");
          setIsEditing(false);
        },
      }
    );
  };

  const handleDisconnect = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setAccessKeyId("");
        setSecretAccessKey("");
        setIsEditing(false);
      },
    });
  };

  const handleStartEditing = () => {
    setAccessKeyId("");
    setSecretAccessKey("");
    setRegion(credential?.region ?? "us-east-1");
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-secondary/50 rounded w-1/3" />
          <div className="h-9 bg-secondary/50 rounded" />
          <div className="h-9 bg-secondary/50 rounded" />
          <div className="h-9 bg-secondary/50 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // Connected state — show masked credentials
  if (hasExistingCredentials && !isEditing) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">AWS Connected</h3>
            <p className="text-sm text-muted-foreground">
              Your AWS credentials are configured for this workspace.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Access Key ID
            </label>
            <div className="flex h-9 w-full items-center rounded-lg border border-border/60 bg-secondary/30 px-3 text-sm text-muted-foreground">
              {credential.accessKeyId ?? "••••••••"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Secret Access Key
            </label>
            <div className="flex h-9 w-full items-center rounded-lg border border-border/60 bg-secondary/30 px-3 text-sm text-muted-foreground">
              ••••••••••••••••
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Region
            </label>
            <div className="flex h-9 w-full items-center rounded-lg border border-border/60 bg-secondary/30 px-3 text-sm text-muted-foreground">
              {credential.region}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleStartEditing}>
            Update Credentials
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDisconnect}
            isLoading={deleteMutation.isPending}
            loadingText="Disconnecting..."
          >
            <Trash2 size={14} />
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  // Form state — new or editing
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border/50 rounded-2xl p-6 space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <KeyRound size={18} className="text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">
            {isEditing ? "Update AWS Credentials" : "Connect AWS Account"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter your IAM user credentials to connect your AWS account.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            AWS Access Key ID
          </label>
          <Input
            type="text"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            AWS Secret Access Key
          </label>
          <Input
            type={showSecret ? "text" : "password"}
            placeholder="Enter your secret access key"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            autoComplete="off"
            rightElement={
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Region
          </label>
          <Dropdown
            value={region}
            onChange={setRegion}
            options={REGION_OPTIONS}
            placeholder="Select region"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!accessKeyId.trim() || !secretAccessKey.trim()}
          isLoading={saveMutation.isPending}
          loadingText="Validating..."
        >
          {isEditing ? "Update Credentials" : "Connect AWS"}
        </Button>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
