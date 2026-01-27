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
import { useWorkspaceId } from "./useWorkspaceId";

export function useChat() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

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

  // Scroll to bottom effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: Messages and isTyping are the only dependencies that should trigger the scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

    chatMutation.mutate({ text, sessionId });
  };

  const createNewChat = () => {
    const newSessionId = generateUUID();
    setActiveSessionId(newSessionId);
    setMessages([]);
    setActiveArtifact(null);
    return newSessionId;
  };

  const deleteSession = (id: string) => {
    // In real app, call delete mutation
    if (activeSessionId === id && sessions.length > 0) {
      setActiveSessionId(sessions.find((s) => s.id !== id)?.id || "");
    }
    // For now we just filter locally if we don't have a mutation yet
    queryClient.setQueryData(
      queryKeys.ai.sessions(workspaceId),
      (old: ChatSession[] | undefined) => old?.filter((s) => s.id !== id)
    );
  };

  const selectSession = async (id: string) => {
    if (id === activeSessionId) return;

    setActiveSessionId(id);
    setIsTyping(true);
    setActiveArtifact(null);

    try {
      console.log("[useChat] Fetching session:", id);
      const { message: aiMessage, history } = await locusClient.ai.getSession(
        workspaceId,
        id
      );

      if (history && history.length > 0) {
        const mappedMessages: Message[] = history.map((m) => {
          const base = {
            id: m.id || generateUUID(),
            role: m.role as "user" | "assistant",
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          };

          if (m.role === "assistant") {
            const assistantMsg: AssistantMessage = {
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
            };
            return assistantMsg;
          }

          const userMsg: UserMessage = {
            ...base,
            role: "user",
            content: m.content,
          };
          return userMsg;
        });

        setMessages(mappedMessages);
      } else {
        // Fallback for sessions with no history item yet but we have a last message
        const welcomeMessage: AssistantMessage = {
          id: aiMessage.id,
          role: "assistant",
          content: aiMessage.content,
          timestamp: new Date(aiMessage.timestamp || Date.now()),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setMessages([]);
    } finally {
      setIsTyping(false);
    }
  };

  return {
    sessions,
    isLoadingSessions,
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
