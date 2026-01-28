"use client";

import { Bot } from "lucide-react";
import { useAuth } from "@/context";
import { SuggestedPrompts } from "./SuggestedPrompts";

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const { user, workspaces } = useAuth();

  const currentWorkspace = workspaces.find((w) => w.id === user?.workspaceId);

  return (
    <div className="mt-12 md:mt-20 max-w-3xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4">
          <Bot size={24} />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Good afternoon, {user?.name?.split(" ")[0] || "User"}
        </h2>
        <p className="text-muted-foreground">
          I have context on the{" "}
          <span className="font-medium text-foreground">
            {currentWorkspace?.name || "current"}
          </span>{" "}
          workspace. How can I help?
        </p>
      </div>

      <SuggestedPrompts onSelect={onSelectPrompt} />
    </div>
  );
}
