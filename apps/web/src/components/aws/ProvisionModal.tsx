"use client";

import { ArrowLeft, ArrowRight, Check, GitBranch, Server } from "lucide-react";
import { useState } from "react";
import { Button, Checkbox, Input, Modal } from "@/components/ui";
import { useProvisionInstance } from "@/hooks/useAwsInstances";
import { cn } from "@/lib/utils";

interface ProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Integration {
  name: string;
  enabled: boolean;
  config: Record<string, string>;
}

const INSTANCE_TYPES = [
  {
    value: "t3.micro",
    label: "t3.micro",
    description: "1 vCPU, 1 GiB RAM",
    price: "~$8/mo",
  },
  {
    value: "t3.small",
    label: "t3.small",
    description: "2 vCPU, 2 GiB RAM",
    price: "~$15/mo",
  },
  {
    value: "t3.medium",
    label: "t3.medium",
    description: "2 vCPU, 4 GiB RAM",
    price: "~$30/mo",
  },
];

const STEPS = ["Repository", "Instance Type", "Integrations", "Review"];

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;

export function ProvisionModal({ isOpen, onClose }: ProvisionModalProps) {
  const [step, setStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [instanceType, setInstanceType] = useState("t3.small");
  const [integrations, setIntegrations] = useState<Integration[]>([
    { name: "Telegram", enabled: false, config: { botToken: "" } },
  ]);
  const [repoError, setRepoError] = useState("");
  const [tokenError, setTokenError] = useState("");

  const provisionMutation = useProvisionInstance();

  const reset = () => {
    setStep(0);
    setRepoUrl("");
    setGithubToken("");
    setInstanceType("t3.small");
    setIntegrations([
      { name: "Telegram", enabled: false, config: { botToken: "" } },
    ]);
    setRepoError("");
    setTokenError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      let valid = true;
      if (!repoUrl.trim()) {
        setRepoError("Repository URL is required");
        valid = false;
      } else if (!GITHUB_REPO_REGEX.test(repoUrl.trim())) {
        setRepoError(
          "Enter a valid GitHub repository URL (https://github.com/owner/repo)"
        );
        valid = false;
      } else {
        setRepoError("");
      }
      if (!githubToken.trim()) {
        setTokenError("GitHub token is required for cloning");
        valid = false;
      } else {
        setTokenError("");
      }
      return valid;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleProvision = () => {
    const enabledIntegrations = integrations
      .filter((i) => i.enabled)
      .map((i) => ({ name: i.name, config: i.config }));

    provisionMutation.mutate(
      {
        repoUrl: repoUrl.trim(),
        githubToken: githubToken.trim(),
        instanceType,
        integrations: enabledIntegrations,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const toggleIntegration = (index: number) => {
    setIntegrations((prev) =>
      prev.map((i, idx) => (idx === index ? { ...i, enabled: !i.enabled } : i))
    );
  };

  const updateIntegrationConfig = (
    index: number,
    key: string,
    value: string
  ) => {
    setIntegrations((prev) =>
      prev.map((i, idx) =>
        idx === index ? { ...i, config: { ...i.config, [key]: value } } : i
      )
    );
  };

  const selectedInstanceType = INSTANCE_TYPES.find(
    (t) => t.value === instanceType
  );

  const repoName = repoUrl
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Provision New Instance"
      size="lg"
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  idx < step
                    ? "bg-primary text-primary-foreground"
                    : idx === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                )}
              >
                {idx < step ? <Check size={14} /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium truncate",
                  idx <= step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 min-w-[20px]",
                  idx < step ? "bg-primary" : "bg-border/50"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[260px]">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                GitHub Repository URL
              </label>
              <Input
                icon={<GitBranch size={16} />}
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  if (repoError) setRepoError("");
                }}
                error={!!repoError}
              />
              {repoError && (
                <p className="text-xs text-red-400 mt-1.5">{repoError}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                GitHub Personal Access Token
              </label>
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  if (tokenError) setTokenError("");
                }}
                error={!!tokenError}
              />
              {tokenError && (
                <p className="text-xs text-red-400 mt-1.5">{tokenError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                Required to clone the repository on the instance.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Select Instance Type
            </label>
            {INSTANCE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setInstanceType(type.value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  instanceType === type.value
                    ? "border-primary/50 bg-primary/5 ring-2 ring-primary/10"
                    : "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    instanceType === type.value
                      ? "border-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {instanceType === type.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {type.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {type.description}
                  </div>
                </div>
                <div className="text-sm font-medium text-primary">
                  {type.price}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Integrations (Optional)
            </label>
            {integrations.map((integration, idx) => (
              <div
                key={integration.name}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  integration.enabled
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-secondary/20"
                )}
              >
                <Checkbox
                  checked={integration.enabled}
                  onChange={() => toggleIntegration(idx)}
                  label={integration.name}
                />
                {integration.enabled && (
                  <div className="mt-3 pl-6.5 space-y-3">
                    {Object.keys(integration.config).map((key) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                        <Input
                          type="password"
                          placeholder={`Enter ${key
                            .replace(/([A-Z])/g, " $1")
                            .trim()
                            .toLowerCase()}`}
                          value={integration.config[key]}
                          onChange={(e) =>
                            updateIntegrationConfig(idx, key, e.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              Review Configuration
            </label>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-secondary/20 border border-border/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Repository</span>
                  <span className="text-foreground font-medium font-mono text-xs">
                    {repoName || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Instance Type</span>
                  <span className="text-foreground font-medium">
                    {selectedInstanceType?.label} ({selectedInstanceType?.price}
                    )
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Specs</span>
                  <span className="text-foreground text-xs">
                    {selectedInstanceType?.description}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Region</span>
                  <span className="text-foreground font-medium">us-east-1</span>
                </div>
                {integrations.some((i) => i.enabled) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Integrations</span>
                    <span className="text-foreground font-medium">
                      {integrations
                        .filter((i) => i.enabled)
                        .map((i) => i.name)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The instance will be provisioned in your AWS account. You pay
                AWS directly for compute costs.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-5 mt-5 border-t border-border/30">
        <div>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft size={14} />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" onClick={handleNext}>
              Next
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleProvision}
              isLoading={provisionMutation.isPending}
              loadingText="Provisioning..."
            >
              <Server size={14} />
              Provision
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
