"use client";

import { generateUUID } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Artifact,
  AssistantMessage,
  ChatSession,
  Message,
  UserMessage,
} from "@/components/chat/types";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useLocalStorage } from "./useLocalStorage";
import { useWorkspaceId } from "./useWorkspaceId";

export function useChat() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  const [activeSessionId, setActiveSessionId] = useLocalStorage<string>(
    `locus-active-chat-session-${workspaceId}`,
    ""
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [shouldScrollSmooth, setShouldScrollSmooth] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Sessions with React Query
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: queryKeys.ai.sessions(workspaceId),
    queryFn: async () => {
      const { sessions: fetchedSessions } =
        await locusClient.ai.listSessions(workspaceId);
      return fetchedSessions.map((s) => ({
        ...s,
        updatedAt: new Date(s.updatedAt),
      })) as ChatSession[];
    },
    enabled: !!workspaceId,
  });

  const sessions = sessionsData || [];

  // 1.5 Fetch Session History with React Query
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.ai.session(activeSessionId, workspaceId),
    queryFn: async () => {
      if (!activeSessionId || !workspaceId) return [];
      const data = await locusClient.ai.getSession(
        workspaceId,
        activeSessionId
      );
      const history = data?.history || [];

      return history.map((m) => {
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
            suggestedActions: m.suggestedActions,
          } as AssistantMessage;
        }

        return {
          ...base,
          role: "user",
          content: m.content,
        } as UserMessage;
      });
    },
    enabled: !!activeSessionId && !!workspaceId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Sync history to messages state
  useEffect(() => {
    if (historyData) {
      setMessages(historyData);
      // After history is loaded, we can enable smooth scrolling for new messages
      setTimeout(() => setShouldScrollSmooth(true), 100);
    }
  }, [historyData]);

  // Scroll to bottom effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: Messages and isTyping are the only dependencies that should trigger the scroll effect
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: shouldScrollSmooth ? "smooth" : "auto",
      });
    }
  }, [messages, isTyping, shouldScrollSmooth]);

  // 2. Mutations
  const chatMutation = useMutation({
    mutationFn: (variables: { text: string; sessionId: string }) =>
      locusClient.ai.chat(workspaceId, {
        message: variables.text,
        sessionId: variables.sessionId,
      }),
    onSuccess: (data) => {
      const aiMessage = data.message;
      const assistantMessage: AssistantMessage = {
        id: aiMessage.id,
        role: "assistant",
        content: aiMessage.content,
        timestamp: new Date(aiMessage.timestamp),
        thoughtProcess: aiMessage.thoughtProcess,
        artifacts: aiMessage.artifacts?.map((art) => ({
          ...art,
          type: (["code", "document", "sprint", "task"].includes(art.type)
            ? art.type
            : "document") as Artifact["type"],
        })),
        suggestedActions: aiMessage.suggestedActions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);

      // Invalidate sessions list as a new chat message might change the title/updatedAt
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.sessions(workspaceId),
      });

      if (!activeSessionId) {
        setActiveSessionId(data.sessionId);
      }
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      setIsTyping(false);
    },
  });

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createNewChat();
    }

    const newMessage: UserMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);
    setShouldScrollSmooth(true);

    chatMutation.mutate({ text, sessionId });
  };

  const createNewChat = () => {
    const newSessionId = "";
    setActiveSessionId(newSessionId);
    setMessages([]);
    setActiveArtifact(null);
    setShouldScrollSmooth(false);
    return newSessionId;
  };

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      locusClient.ai.deleteSession(workspaceId, sessionId),
    onError: (error) => {
      console.error("Failed to delete session:", error);
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.sessions(workspaceId),
      });
    },
  });

  const deleteSession = (id: string) => {
    // Optimistic update
    if (activeSessionId === id) {
      const nextSession = sessions.find((s) => s.id !== id);
      setActiveSessionId(nextSession?.id || "");
    }

    queryClient.setQueryData(
      queryKeys.ai.sessions(workspaceId),
      (old: ChatSession[] | undefined) => old?.filter((s) => s.id !== id)
    );

    deleteSessionMutation.mutate(id);
  };

  const selectSession = async (id: string) => {
    if (id === activeSessionId) return;

    setShouldScrollSmooth(false);
    setActiveSessionId(id);
    setIsTyping(false);
    setActiveArtifact(null);
  };

  return {
    sessions,
    isLoadingSessions,
    isLoadingHistory,
    activeSessionId,
    messages,
    isTyping,
    activeArtifact,
    setActiveArtifact,
    messagesEndRef,
    sendMessage,
    createNewChat,
    deleteSession,
    selectSession,
  };
}
