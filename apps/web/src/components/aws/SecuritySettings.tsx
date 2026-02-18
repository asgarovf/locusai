"use client";

import { type SecurityRuleInfo } from "@locusai/sdk";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button, Input, showToast } from "@/components/ui";
import {
  useInstanceSecurity,
  useUpdateInstanceSecurity,
} from "@/hooks/useAwsInstances";
import { cn } from "@/lib/utils";

interface SecuritySettingsProps {
  instanceId: string;
  enabled: boolean;
}

const CIDR_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;

function isOpenToAll(rules: SecurityRuleInfo[]): boolean {
  return rules.some(
    (rule) => rule.port === 22 && rule.cidr === "0.0.0.0/0"
  );
}

function getSshCidrs(rules: SecurityRuleInfo[]): string[] {
  return rules.filter((rule) => rule.port === 22).map((rule) => rule.cidr);
}

export function SecuritySettings({
  instanceId,
  enabled,
}: SecuritySettingsProps) {
  const [newIp, setNewIp] = useState("");
  const [ipError, setIpError] = useState<string | null>(null);
  const [isDetectingIp, setIsDetectingIp] = useState(false);

  const securityQuery = useInstanceSecurity(instanceId, enabled);
  const updateSecurity = useUpdateInstanceSecurity();

  const rules = securityQuery.data ?? [];
  const sshCidrs = getSshCidrs(rules);
  const isOpen = isOpenToAll(rules);

  const handleAddIp = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;

    if (!CIDR_REGEX.test(trimmed)) {
      setIpError("Invalid CIDR format (e.g. 203.0.113.5/32)");
      return;
    }

    setIpError(null);

    // Build the new list: replace 0.0.0.0/0 with the new specific IP, or append
    const currentCidrs = sshCidrs.filter((c) => c !== "0.0.0.0/0");
    if (currentCidrs.includes(trimmed)) {
      setIpError("This IP is already in the list");
      return;
    }

    const newCidrs = [...currentCidrs, trimmed];
    updateSecurity.mutate(
      { instanceId, allowedIps: newCidrs },
      { onSuccess: () => setNewIp("") }
    );
  };

  const handleRemoveIp = (cidr: string) => {
    const newCidrs = sshCidrs.filter((c) => c !== cidr);
    // If removing the last specific IP, it will default to 0.0.0.0/0 on backend
    updateSecurity.mutate({ instanceId, allowedIps: newCidrs });
  };

  const handleRestrictToMyIp = async () => {
    setIsDetectingIp(true);
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      const myIp = data.ip as string;
      const cidr = `${myIp}/32`;

      updateSecurity.mutate(
        { instanceId, allowedIps: [cidr] },
        {
          onSuccess: () => {
            showToast.success(`Restricted SSH access to ${myIp}`);
          },
        }
      );
    } catch {
      showToast.error("Failed to detect your public IP");
    } finally {
      setIsDetectingIp(false);
    }
  };

  if (!enabled) return null;

  if (securityQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 size={12} className="animate-spin" />
        Loading security rules...
      </div>
    );
  }

  if (securityQuery.isError) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Warning banner */}
      {isOpen && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <ShieldAlert
            size={14}
            className="text-amber-500 shrink-0 mt-0.5"
          />
          <div className="text-xs text-amber-400">
            <span className="font-medium">SSH is open to all IPs.</span>{" "}
            We recommend restricting access to your IP address.
          </div>
        </div>
      )}

      {/* Current allowed IPs */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          SSH Access
        </div>
        <div className="space-y-1.5">
          {sshCidrs.map((cidr) => (
            <div
              key={cidr}
              className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div className="flex items-center gap-2">
                <Wifi size={12} className="text-muted-foreground" />
                <span className="font-mono text-xs text-foreground">
                  {cidr}
                </span>
                {cidr === "0.0.0.0/0" && (
                  <Badge variant="warning" size="sm">
                    Open
                  </Badge>
                )}
              </div>
              {cidr !== "0.0.0.0/0" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveIp(cidr)}
                  disabled={updateSecurity.isPending}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 size={12} className="text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add IP input */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={newIp}
            onChange={(e) => {
              setNewIp(e.target.value);
              setIpError(null);
            }}
            placeholder="203.0.113.5/32"
            className="text-xs h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddIp();
            }}
          />
          {ipError && (
            <span className="text-xs text-red-400 mt-1 block">{ipError}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddIp}
          disabled={updateSecurity.isPending || !newIp.trim()}
          className="h-8"
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Restrict to my IP button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRestrictToMyIp}
        disabled={updateSecurity.isPending || isDetectingIp}
        isLoading={isDetectingIp || updateSecurity.isPending}
        loadingText="Detecting IP..."
        className="w-full"
      >
        <Shield size={14} />
        Restrict to my IP
      </Button>
    </div>
  );
}

export function SecurityIndicator({
  instanceId,
  enabled,
}: {
  instanceId: string;
  enabled: boolean;
}) {
  const securityQuery = useInstanceSecurity(instanceId, enabled);

  if (!enabled || securityQuery.isLoading || securityQuery.isError) {
    return null;
  }

  const rules = securityQuery.data ?? [];
  const isOpen = isOpenToAll(rules);

  return (
    <div
      title={
        isOpen
          ? "SSH open to all IPs"
          : "SSH restricted to specific IPs"
      }
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs",
        isOpen
          ? "bg-amber-500/10 text-amber-500"
          : "bg-emerald-500/10 text-emerald-500"
      )}
    >
      {isOpen ? (
        <>
          <ShieldAlert size={12} />
        </>
      ) : (
        <>
          <Shield size={12} />
        </>
      )}
    </div>
  );
}
