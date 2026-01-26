"use client";

import { useEffect, useRef, useState } from "react";
import {
  Artifact,
  ChatSession,
  Message,
  UserMessage,
} from "@/components/chat/types";

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Messages and isTyping are the only dependencies that should trigger the scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const newMessage: UserMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    // TODO: Connect to real API
    // For now, we just stop typing after a delay to simulate processing, but no fake response.
    setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const createNewChat = () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: "New Chat",
      updatedAt: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setMessages([]);
    setActiveArtifact(null);
    return newSessionId;
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
    // In real app, load messages for this ID
    if (id !== activeSessionId) setMessages([]);
    setActiveArtifact(null);
  };

  return {
    sessions,
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
