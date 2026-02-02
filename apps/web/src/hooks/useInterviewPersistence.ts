"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Message } from "@/components/chat/types";
import {
  getStorageJSON,
  removeStorageItem,
  setStorageJSON,
} from "@/lib/local-storage";
import { getInterviewBackupKey } from "@/lib/local-storage-keys";
import { useManifestCompletion } from "./useManifestCompletion";
import { useWorkspaceIdOptional } from "./useWorkspaceId";

/**
 * Interface for the interview chat backup stored in localStorage
 */
export interface InterviewChatBackup {
  workspaceId: string;
  sessionId: string;
  messages: Message[];
  timestamp: number;
  manifestProgress: number;
}

/**
 * Serializes messages for localStorage storage
 * Converts Date objects to ISO strings for proper JSON serialization
 */
function serializeMessages(messages: Message[]): Message[] {
  return messages.map((msg) => ({
    ...msg,
    timestamp:
      msg.timestamp instanceof Date
        ? (msg.timestamp.toISOString() as unknown as Date)
        : msg.timestamp,
  }));
}

/**
 * Deserializes messages from localStorage
 * Converts ISO strings back to Date objects
 */
function deserializeMessages(messages: Message[]): Message[] {
  return messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
}

interface UseInterviewPersistenceOptions {
  /** Current messages in the chat */
  messages: Message[];
  /** Current active session ID */
  sessionId: string;
  /** Whether the user is currently in an active interview (manifest not complete) */
  enabled?: boolean;
}

interface UseInterviewPersistenceReturn {
  /** Manually backup current messages */
  backupNow: () => void;
  /** Restore messages from backup */
  restoreFromBackup: () => InterviewChatBackup | null;
  /** Clear the current backup */
  clearBackup: () => void;
  /** Check if a backup exists */
  hasBackup: boolean;
  /** Get the backup data without applying it */
  getBackup: () => InterviewChatBackup | null;
}

/**
 * Hook for managing interview chat persistence in localStorage.
 *
 * Provides automatic backup of interview chat messages to prevent data loss
 * during network issues or page refreshes. Backs up on:
 * - Message changes (debounced)
 * - Page unload (beforeunload event)
 *
 * Automatically cleans up backup when interview is completed.
 */
export function useInterviewPersistence({
  messages,
  sessionId,
  enabled = true,
}: UseInterviewPersistenceOptions): UseInterviewPersistenceReturn {
  const workspaceId = useWorkspaceIdOptional();
  const { isComplete, percentage } = useManifestCompletion();
  const lastBackupRef = useRef<number>(0);

  // Calculate if we should be backing up
  const shouldBackup = enabled && !isComplete && !!workspaceId;

  // Get storage key for this workspace
  const storageKey = workspaceId ? getInterviewBackupKey(workspaceId) : "";

  /**
   * Get existing backup from localStorage
   */
  const getBackup = useCallback((): InterviewChatBackup | null => {
    if (!storageKey) return null;
    const backup = getStorageJSON<InterviewChatBackup | null>(storageKey, null);
    if (backup) {
      return {
        ...backup,
        messages: deserializeMessages(backup.messages),
      };
    }
    return null;
  }, [storageKey]);

  /**
   * Check if backup exists
   */
  const hasBackup = !!getBackup();

  /**
   * Backup current messages to localStorage
   */
  const backupNow = useCallback(() => {
    if (!shouldBackup || !workspaceId || messages.length === 0) return;

    const backup: InterviewChatBackup = {
      workspaceId,
      sessionId,
      messages: serializeMessages(messages),
      timestamp: Date.now(),
      manifestProgress: percentage,
    };

    setStorageJSON(storageKey, backup);
    lastBackupRef.current = Date.now();
  }, [shouldBackup, workspaceId, sessionId, messages, percentage, storageKey]);

  /**
   * Restore messages from backup
   */
  const restoreFromBackup = useCallback((): InterviewChatBackup | null => {
    return getBackup();
  }, [getBackup]);

  /**
   * Clear the backup
   */
  const clearBackup = useCallback(() => {
    if (storageKey) {
      removeStorageItem(storageKey);
    }
  }, [storageKey]);

  // Auto-backup on message changes (debounced)
  useEffect(() => {
    if (!shouldBackup || messages.length === 0) return;

    // Debounce backup to avoid excessive writes
    const debounceMs = 2000;
    const timeSinceLastBackup = Date.now() - lastBackupRef.current;

    if (timeSinceLastBackup < debounceMs) {
      const timer = setTimeout(() => {
        backupNow();
      }, debounceMs - timeSinceLastBackup);

      return () => clearTimeout(timer);
    }

    backupNow();
  }, [messages, shouldBackup, backupNow]);

  // Backup on page unload
  useEffect(() => {
    if (!shouldBackup) return;

    const handleUnload = () => {
      if (messages.length > 0 && workspaceId) {
        // Use sync localStorage write on unload
        const backup: InterviewChatBackup = {
          workspaceId,
          sessionId,
          messages: serializeMessages(messages),
          timestamp: Date.now(),
          manifestProgress: percentage,
        };
        setStorageJSON(storageKey, backup);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [shouldBackup, messages, workspaceId, sessionId, percentage, storageKey]);

  // Clear backup when interview is completed
  useEffect(() => {
    if (isComplete && storageKey) {
      removeStorageItem(storageKey);
    }
  }, [isComplete, storageKey]);

  return {
    backupNow,
    restoreFromBackup,
    clearBackup,
    hasBackup,
    getBackup,
  };
}
