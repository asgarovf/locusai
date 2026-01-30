"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Modal, showToast } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "cli" | "mcp";

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("cli");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast.success(`${label} copied to clipboard`);
  };

  const cliCommand = `locus run --api-key=<YOUR_API_KEY>`;

  const mcpConfig = `{
  "mcpServers": {
    "locus-mcp": {
      "url": "https://mcp.locusai.dev/mcp",
      "headers": {
        "x-api-key": "<YOUR_LOCUS_API_KEY>"
      },
      "alwaysAllow": ["read_resource", "list_resources", "call_tool"]
    }
  }
}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Connect to Locus
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you want to connect your development environment to
            Locus.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab("cli")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === "cli"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Locus CLI
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
              activeTab === "mcp"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            MCP Server
          </button>
        </div>

        <div className="flex-1">
          {activeTab === "cli" ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-sm text-foreground font-medium mb-3">
                  Run Locus Agent directly
                </p>
                <div className="relative group">
                  <div className="bg-background border border-border rounded-lg p-4 font-mono text-sm text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all pr-12">
                    {cliCommand}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(cliCommand, "Command")}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Replace{" "}
                  <code className="text-primary">{"<YOUR_API_KEY>"}</code> with
                  your actual API key from Settings.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-sm text-foreground font-medium mb-3">
                  Add to your Editor Config (Cursor/VSCode)
                </p>
                <div className="relative group">
                  <pre className="bg-background border border-border rounded-lg p-4 font-mono text-xs text-muted-foreground overflow-x-auto">
                    {mcpConfig}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(mcpConfig, "Configuration")}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-border flex justify-end gap-3">
          <Link
            href="https://locusai.dev/docs/mcp-integration"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline">Read Documentation</Button>
          </Link>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
