"use client";

import { Check, Clipboard, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { SettingSection } from "./SettingSection";

interface ProjectSetupGuideProps {
  hasApiKeys: boolean;
  workspaceId?: string;
}

export function ProjectSetupGuide({
  hasApiKeys,
  workspaceId,
}: ProjectSetupGuideProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const steps = [
    {
      id: "api-key",
      title: "1. Create an API Key",
      description:
        "You'll need an API key to authenticate the CLI with your organization.",
      status: hasApiKeys ? "completed" : "pending",
      content: hasApiKeys ? (
        <p className="text-sm text-green-500 flex items-center gap-2">
          <Check size={16} /> API key created
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Go to the API Keys section above and create your first key.
        </p>
      ),
    },
    {
      id: "install",
      title: "2. Initialize your project",
      description:
        "Run this command in your project root to set up Locus configuration and CLAUDE.md.",
      status: "action",
      command: "npx @locusai/cli init",
    },
    {
      id: "run",
      title: "3. Start your agents",
      description:
        "Run this command to start an agent that will poll for tasks from your dashboard.",
      status: "action",
      command: `npx @locusai/cli run --api-key YOUR_API_KEY --workspace ${workspaceId || "YOUR_WORKSPACE_ID"}`,
    },
  ];

  return (
    <SettingSection title="Project Setup Guide">
      <div className="p-6 space-y-8">
        {steps.map((step) => (
          <div key={step.id} className="relative pl-8">
            {/* Connector Line */}
            {step.id !== "run" && (
              <div className="absolute left-[11px] top-8 bottom-[-32px] w-[2px] bg-border/50" />
            )}

            {/* Step Indicator */}
            <div
              className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                step.status === "completed"
                  ? "bg-green-500/10 border-green-500 text-green-500"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {step.status === "completed" ? (
                <Check size={12} />
              ) : step.id === "api-key" ? (
                "1"
              ) : step.id === "install" ? (
                "2"
              ) : (
                "3"
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-foreground">
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>

              {step.content}

              {step.command && (
                <div className="group relative">
                  <div className="bg-secondary/50 border border-border/50 rounded-xl p-3 font-mono text-xs flex items-center justify-between overflow-x-auto">
                    <code className="text-foreground whitespace-nowrap">
                      <span className="text-muted-foreground mr-2">$</span>
                      {step.command}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (step.command) {
                          copyToClipboard(step.command, step.id);
                        }
                      }}
                    >
                      {copiedCommand === step.id ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Clipboard size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-4 flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          <Terminal size={18} className="text-primary" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pro tip:</span> You
            can also set{" "}
            <code className="bg-secondary px-1 rounded text-foreground">
              LOCUS_API_KEY
            </code>{" "}
            environment variable to avoid passing it via flags.
          </p>
        </div>
      </div>
    </SettingSection>
  );
}
