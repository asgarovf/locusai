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
import { useChatStore } from "@/stores/chat-store";
import { useLocalStorage } from "./useLocalStorage";
import { useWorkspaceId } from "./useWorkspaceId";

export function useChat() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  const {
    activeSessionId,
    messages,
    isTyping,
    loadingState,
    sessions,
    activeArtifact,
    intent,
    setActiveSessionId,
    setMessages,
    addMessage,
    setIsTyping,
    setLoadingState,
    setIntent,
    setSessions,
    setActiveArtifact,
  } = useChatStore();

  const [localActiveSessionId, setLocalActiveSessionId] =
    useLocalStorage<string>(`locus-active-chat-session-${workspaceId}`, "");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tempSessionIdRef = useRef<string | null>(null);

  // Sync store with local storage on mount/change
  useEffect(() => {
    // Only restore if we are not already in a session and local storage has one
    if (
      localActiveSessionId &&
      localActiveSessionId !== activeSessionId &&
      !tempSessionIdRef.current
    ) {
      setActiveSessionId(localActiveSessionId);
    }
  }, [localActiveSessionId, activeSessionId, setActiveSessionId]);

  // 1. Fetch Sessions
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
    staleTime: 1000 * 60 * 5, // 5 minutes stale time to avoid flicker
  });

  // Sync sessions to store (carefully)
  useEffect(() => {
    if (sessionsData) {
      setSessions((prev) => {
        // If we have a temp session, keep it until we get the real one or merge it
        const hasTemp = prev.some((s) => s.id === tempSessionIdRef.current);
        if (hasTemp && tempSessionIdRef.current) {
          // Verify if the real session for this temp ID has arrived (unlikely without ID swap logic)
          // For now, just prepend existing sessions if they are not there
          return prev;
        }
        return sessionsData;
      });
    }
  }, [sessionsData, setSessions]);

  // 1.5 Fetch Session History
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: queryKeys.ai.session(activeSessionId, workspaceId),
    queryFn: async () => {
      if (
        !activeSessionId ||
        !workspaceId ||
        activeSessionId === tempSessionIdRef.current
      )
        return [];
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
    enabled:
      !!activeSessionId &&
      !!workspaceId &&
      activeSessionId !== tempSessionIdRef.current,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Sync history to store
  useEffect(() => {
    if (historyData && loadingState === "IDLE" && !isTyping) {
      setMessages(historyData);
    }
  }, [historyData, loadingState, isTyping, setMessages]);

  // Scroll to bottom
  const [shouldScrollSmooth, setShouldScrollSmooth] = useState(false);
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: shouldScrollSmooth ? "smooth" : "auto",
      });
    }
  }, [messages.length, shouldScrollSmooth]);

  // 2. Mutations
  const executeMutation = useMutation({
    mutationFn: (variables: { sessionId: string; executionId: string }) =>
      locusClient.ai.executeIntent(workspaceId, {
        sessionId: variables.sessionId,
        executionId: variables.executionId,
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

      addMessage(assistantMessage);
      setIsTyping(false);
      setLoadingState("IDLE");
      setIntent("");

      // Update Cache immediately
      queryClient.setQueryData<Message[]>(
        queryKeys.ai.session(activeSessionId, workspaceId),
        (old) => {
          return [...(old || []), assistantMessage];
        }
      );

      // Invalidate sessions to get the final title from server
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.sessions(workspaceId),
      });
    },
    onError: (error) => {
      console.error("Failed to execute intent:", error);
      setIsTyping(false);
      setLoadingState("IDLE");
      setIntent("");
      const errorMessage = {
        id: generateUUID(),
        role: "assistant",
        content: "I'm sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      } as AssistantMessage;
      addMessage(errorMessage);

      // Update Cache with error message so it persists
      queryClient.setQueryData<Message[]>(
        queryKeys.ai.session(activeSessionId, workspaceId),
        (old) => {
          return [...(old || []), errorMessage];
        }
      );
    },
  });

  const detectMutation = useMutation({
    mutationFn: (variables: { text: string; sessionId: string }) =>
      locusClient.ai.detectIntent(workspaceId, {
        message: variables.text,
        sessionId: variables.sessionId,
      }),
    onSuccess: (data) => {
      setLoadingState("EXECUTING");
      if (data.intent) {
        setIntent(data.intent);
      }

      // Handle ID swap if we were using a temp session
      if (tempSessionIdRef.current === activeSessionId) {
        // Swap temp ID with real ID in sessions list
        setSessions((prev) =>
          prev.map((s) =>
            s.id === tempSessionIdRef.current ? { ...s, id: data.sessionId } : s
          )
        );
        setActiveSessionId(data.sessionId);
        setLocalActiveSessionId(data.sessionId);
        tempSessionIdRef.current = null;
      } else if (!activeSessionId) {
        // Fallback if somehow we didn't set optimistic session
        setActiveSessionId(data.sessionId);
        setLocalActiveSessionId(data.sessionId);
      }

      executeMutation.mutate({
        sessionId: data.sessionId,
        executionId: data.executionId,
      });
    },
    onError: (error) => {
      console.error("Failed to detect intent:", error);
      setIsTyping(false);
      setLoadingState("IDLE");
      setIntent("");
      // Clean up temp session on failure
      if (tempSessionIdRef.current) {
        setSessions((prev) =>
          prev.filter((s) => s.id !== tempSessionIdRef.current)
        );
        setActiveSessionId("");
        tempSessionIdRef.current = null;
      }
    },
  });

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    let currentSessionId = activeSessionId;

    // Optimistic New Session
    if (!currentSessionId) {
      const tempId = generateUUID();
      tempSessionIdRef.current = tempId;
      currentSessionId = tempId;

      const newSession: ChatSession = {
        id: tempId,
        title: text.slice(0, 30) + (text.length > 30 ? "..." : ""),
        updatedAt: new Date(),
        summary: text,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(tempId);
    }

    // Optimistic User Message
    const newMessage: UserMessage = {
      id: generateUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    addMessage(newMessage);
    setIsTyping(true);
    setLoadingState("DETECTING");
    setShouldScrollSmooth(true);

    // Update Cache for User Message
    // This effectively "commits" the optimistic message to the cache so the effect won't wipe it out.
    // Note: If it's a temp session, the key might change, but for existing sessions this is critical.
    if (!tempSessionIdRef.current) {
      queryClient.setQueryData<Message[]>(
        queryKeys.ai.session(activeSessionId, workspaceId),
        (old) => {
          return [...(old || []), newMessage];
        }
      );
    }

    // Call detect
    // Pass empty string for ID if it's a temp one to tell backend to create new
    const backendSessionId = tempSessionIdRef.current ? "" : currentSessionId;
    detectMutation.mutate({ text, sessionId: backendSessionId });
  };

  const createNewChat = () => {
    setActiveSessionId("");
    setLocalActiveSessionId("");
    setMessages([]);
    setActiveArtifact(null);
    setShouldScrollSmooth(false);
    tempSessionIdRef.current = null;
    return "";
  };

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      locusClient.ai.deleteSession(workspaceId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.sessions(workspaceId),
      });
    },
  });

  const deleteSession = (id: string) => {
    if (activeSessionId === id) {
      createNewChat();
    }
    // Optimistic update in store
    setSessions((prev) => prev.filter((s) => s.id !== id));
    deleteSessionMutation.mutate(id);
  };

  const selectSession = async (id: string) => {
    if (id === activeSessionId) return;

    setShouldScrollSmooth(false);
    setActiveSessionId(id);
    setLocalActiveSessionId(id);
    setIsTyping(false);
    setActiveArtifact(null);
    setLoadingState("IDLE");
    setMessages([]); // Clear previous messages while loading
    tempSessionIdRef.current = null; // Clear temp ref on switch
  };

  return {
    sessions,
    isLoadingSessions,
    isLoadingHistory,
    activeSessionId,
    messages,
    isTyping,
    loadingState,
    intent,
    activeArtifact,
    setActiveArtifact,
    messagesEndRef,
    sendMessage,
    createNewChat,
    deleteSession,
    selectSession,
  };
}
