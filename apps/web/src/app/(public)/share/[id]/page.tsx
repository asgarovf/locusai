"use client";

import { generateUUID } from "@locusai/shared";
import { useQuery } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArtifactPanel, ChatLayout, ChatMessage } from "@/components/chat";
import {
  Artifact,
  AssistantMessage,
  UserMessage,
} from "@/components/chat/types";
import { Button } from "@/components/ui";
import { locusClient } from "@/lib/api-client";

export default function SharedChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shared-chat", id],
    queryFn: async () => {
      const data = await locusClient.ai.getSharedSession(id);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">
          Loading shared chat...
        </p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center text-foreground">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-4">
          <Globe size={32} />
        </div>
        <h1 className="text-2xl font-bold">Chat Not Found</h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          This chat might not be shared publicly or the link is invalid.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Go to Locus AI
        </Button>
      </div>
    );
  }

  const messages = (session.history || []).map((m) => {
    const base = {
      id: m.id || generateUUID(),
      role: m.role as "user" | "assistant",
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    };

    if (m.role === "assistant") {
      return {
        ...base,
        role: "assistant",
        content: m.content,
        thoughtProcess: m.thoughtProcess,
        artifacts: m.artifacts?.map((art) => ({
          ...art,
          type: ["code", "document", "sprint", "task"].includes(art.type)
            ? art.type
            : "document",
        })),
      } as AssistantMessage;
    }

    return {
      ...base,
      role: "user",
      content: m.content,
    } as UserMessage;
  });

  return (
    <div className="h-screen w-full overflow-hidden">
      <ChatLayout
        isArtifactOpen={!!activeArtifact}
        sidebar={null}
        artifactPanel={
          <ArtifactPanel
            isOpen={!!activeArtifact}
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
          />
        }
      >
        <div className="flex flex-col h-full bg-background text-foreground">
          {/* Public Header */}
          <header className="flex items-center gap-3 p-4 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10 h-16 shrink-0">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Locus"
                width={80}
                height={30}
                className="rounded-lg"
              />
            </div>
            <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">
                Shared Chat
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Globe size={10} /> Public View
              </span>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Sign In
              </Button>
            </div>
          </header>

          {/* Messages */}
          <main className="flex-1 overflow-y-auto p-4 md:px-8 lg:px-12 bg-linear-to-b from-background to-secondary/10 scrollbar-thin">
            <div className="max-w-5xl mx-auto space-y-8 py-8">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-8 flex items-start gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">
                    Publicly Shared Chat
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    You are viewing a conversation shared via Locus AI. This is
                    a read-only view of the session.
                  </p>
                </div>
              </div>

              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  artifacts={
                    message.role === "assistant" ? message.artifacts : undefined
                  }
                  onArtifactClick={(art) => setActiveArtifact(art)}
                />
              ))}

              <div className="pt-12 pb-20 text-center">
                <p className="text-xs text-muted-foreground">
                  End of shared conversation
                </p>
                <Button
                  variant="subtle"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                >
                  Create your own chat with Locus AI
                </Button>
              </div>
            </div>
          </main>
        </div>
      </ChatLayout>
    </div>
  );
}
