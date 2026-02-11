"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { Button, Modal, showToast } from "@/components/ui";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectionModal({ isOpen, onClose }: ConnectionModalProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast.success(`${label} copied to clipboard`);
  };

  const cliCommand = `locus run --api-key=<YOUR_API_KEY>`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Connect to Locus
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your development environment to Locus using the CLI.
          </p>
        </div>

        <div className="flex-1">
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
                Replace <code className="text-primary">{"<YOUR_API_KEY>"}</code>{" "}
                with your actual API key from Settings.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border flex justify-end gap-3">
          <Link
            href="https://docs.locusai.dev"
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
