"use client";

import { $FixMe, generateUUID } from "@locusai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AssistantMessage,
  ChatSession,
  Message,
  UserMessage,
} from "@/components/chat/types";
import { locusClient } from "@/lib/api-client";
import { getStorageJSON, removeStorageItem } from "@/lib/local-storage";
import {
  getChatSessionKey,
  getInterviewBackupKey,
} from "@/lib/local-storage-keys";
import { queryKeys } from "@/lib/query-keys";
import { useChatStore } from "@/stores/chat-store";
import type { InterviewChatBackup } from "./useInterviewPersistence";
import { useLocalStorage } from "./useLocalStorage";
import { useWorkspaceId } from "./useWorkspaceId";

/**
 * Sort messages by timestamp to ensure consistent ordering.
 * Messages without timestamps are placed at the end.
 */
function sortMessagesByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const timeA = a.timestamp?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const timeB = b.timestamp?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });
}

export function useChat() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  const {
    activeSessionId,
    messages,
    isTyping,
    loadingState,
    sessions,
    intent,
    setActiveSessionId,
    setMessages,
    addMessage,
    setIsTyping,
    setLoadingState,
    setIntent,
    setSessions,
  } = useChatStore();

  const [localActiveSessionId, setLocalActiveSessionId] =
    useLocalStorage<string>(getChatSessionKey(workspaceId), "");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tempSessionIdRef = useRef<string | null>(null);
  const hasRestoredBackupRef = useRef(false);

  /**
   * Get interview backup from localStorage
   */
  const getInterviewBackup = useCallback((): InterviewChatBackup | null => {
    if (!workspaceId) return null;
    const backupKey = getInterviewBackupKey(workspaceId);
    const backup = getStorageJSON<InterviewChatBackup | null>(backupKey, null);
    if (backup) {
      return {
        ...backup,
        messages: backup.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      };
    }
    return null;
  }, [workspaceId]);

  /**
   * Clear interview backup from localStorage
   */
  const clearInterviewBackup = useCallback(() => {
    if (!workspaceId) return;
    const backupKey = getInterviewBackupKey(workspaceId);
    removeStorageItem(backupKey);
  }, [workspaceId]);

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
        isShared: (s as $FixMe).isShared,
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

  // Sync history to store and restore backup if needed
  useEffect(() => {
    if (historyData && loadingState === "IDLE" && !isTyping) {
      // Check for interview backup to restore unsent messages
      if (!hasRestoredBackupRef.current) {
        const backup = getInterviewBackup();
        hasRestoredBackupRef.current = true;

        if (backup && backup.messages.length > 0) {
          // Find user messages in backup that are not in server history
          // These are messages that were sent but not synced (network failure)
          const serverMessageIds = new Set(historyData.map((m) => m.id));
          const serverMessageContents = new Set(
            historyData.filter((m) => m.role === "user").map((m) => m.content)
          );

          // Get unsent user messages (not in server by ID or content)
          const unsentMessages = backup.messages.filter(
            (m) =>
              m.role === "user" &&
              !serverMessageIds.has(m.id) &&
              !serverMessageContents.has(m.content)
          );

          if (unsentMessages.length > 0) {
            // Merge server history with unsent messages
            const mergedMessages = [...historyData, ...unsentMessages];
            setMessages(mergedMessages);
            // Clear the backup since we've restored
            clearInterviewBackup();
            return;
          }

          // If backup matches server or has no new messages, just clear it
          clearInterviewBackup();
        }
      }

      setMessages(historyData);
    }
  }, [
    historyData,
    loadingState,
    isTyping,
    setMessages,
    getInterviewBackup,
    clearInterviewBackup,
  ]);

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
        suggestedActions: aiMessage.suggestedActions,
      };

      addMessage(assistantMessage);
      setIsTyping(false);
      setLoadingState("IDLE");
      setIntent("");

      // Update Cache immediately - sort by timestamp for consistency
      queryClient.setQueryData<Message[]>(
        queryKeys.ai.session(activeSessionId, workspaceId),
        (old) => sortMessagesByTimestamp([...(old || []), assistantMessage])
      );

      // Invalidate sessions to get the final title from server
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.sessions(workspaceId),
      });

      // Invalidate manifest status to update progress after AI response
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.manifestStatus(workspaceId),
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
        (old) => sortMessagesByTimestamp([...(old || []), errorMessage])
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
        (old) => sortMessagesByTimestamp([...(old || []), newMessage])
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
    setLoadingState("IDLE");
    setMessages([]); // Clear previous messages while loading
    tempSessionIdRef.current = null; // Clear temp ref on switch
    hasRestoredBackupRef.current = false; // Allow backup restoration for new session
  };
  const shareSessionMutation = useMutation({
    mutationFn: (variables: { id: string; isShared: boolean }) =>
      locusClient.ai.shareSession(workspaceId, variables.id, {
        isShared: variables.isShared,
      }),
    onSuccess: (_, variables) => {
      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === variables.id ? { ...s, isShared: variables.isShared } : s
        )
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.sessions(workspaceId),
      });
    },
  });

  const shareSession = (id: string, isShared: boolean) => {
    shareSessionMutation.mutate({ id, isShared });
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
    messagesEndRef,
    sendMessage,
    createNewChat,
    deleteSession,
    selectSession,
    shareSession,
    isSharing: shareSessionMutation.isPending,
  };
}
