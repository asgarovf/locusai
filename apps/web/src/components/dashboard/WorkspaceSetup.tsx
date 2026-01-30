"use client";

import { Copy, Key, LayoutDashboard, Terminal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, showToast } from "@/components/ui";
import { ConnectionModal } from "./ConnectionModal";

interface WorkspaceSetupProps {
  workspaceId: string;
}

export function WorkspaceSetup({ workspaceId }: WorkspaceSetupProps) {
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* API Key CTA */}
        <div className="relative overflow-hidden bg-linear-to-br from-primary/10 via-background to-background border border-primary/20 rounded-xl p-6 flex flex-col justify-between group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Key size={64} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Key size={20} />
              </div>
              <h3 className="font-semibold text-lg">API Access</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Create an API key to verify your identity and access Locus from
              your terminal.
            </p>
          </div>
          <Link href="/settings/api-keys" className="mt-6">
            <Button className="w-full" variant="secondary">
              Get API Key
            </Button>
          </Link>
        </div>

        {/* Workspace ID */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                <LayoutDashboard size={20} />
              </div>
              <h3 className="font-semibold text-lg">Workspace ID</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this ID to configure your environment variables and CLI.
            </p>
          </div>
          <div
            className="mt-6 bg-muted/50 hover:bg-muted p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors border border-border/50"
            onClick={() => {
              navigator.clipboard.writeText(workspaceId);
              showToast.success("Workspace ID copied to clipboard");
            }}
          >
            <code className="text-sm font-mono truncate max-w-[200px] text-foreground">
              {workspaceId}
            </code>
            <Copy size={16} className="text-muted-foreground" />
          </div>
        </div>

        {/* Connect */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                <Terminal size={20} />
              </div>
              <h3 className="font-semibold text-lg">Connect</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your local environment via CLI or setup MCP integration
              for your AI editor.
            </p>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setIsConnectionModalOpen(true)}
          >
            <Terminal className="mr-2" size={16} />
            Connection Guide
          </Button>
        </div>
      </div>

      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}
