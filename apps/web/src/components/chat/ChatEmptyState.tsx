"use client";

import { Bot } from "lucide-react";
import { useAuth } from "@/context";
import { SuggestedPrompts } from "./SuggestedPrompts";

interface ChatEmptyStateProps {
  onSelectPrompt: (text: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const { user } = useAuth();

  return (
    <div className="mt-12 md:mt-20">
      <div className="text-center mb-10 space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4">
          <Bot size={24} />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Good afternoon, {user?.name?.split(" ")[0] || "User"}
        </h2>
        <p className="text-muted-foreground">
          I have context on your 3 workspaces and 12 docs. How can I help?
        </p>
      </div>
      <SuggestedPrompts onSelect={onSelectPrompt} />
    </div>
  );
}
