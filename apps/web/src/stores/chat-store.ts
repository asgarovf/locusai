import { create } from "zustand";
import { ChatSession, Message } from "@/components/chat/types";

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

interface ChatState {
  activeSessionId: string;
  messages: Message[];
  isTyping: boolean;
  loadingState: "IDLE" | "DETECTING" | "EXECUTING";
  intent: string;
  sessions: ChatSession[];

  // Actions
  setName: (name: string) => void;
  setActiveSessionId: (id: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  setIsTyping: (isTyping: boolean) => void;
  setLoadingState: (state: "IDLE" | "DETECTING" | "EXECUTING") => void;
  setIntent: (intent: string) => void;
  setSessions: (
    sessions: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])
  ) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeSessionId: "",
  messages: [],
  isTyping: false,
  loadingState: "IDLE",
  intent: "",
  sessions: [],

  setName: (name) => set((state) => ({ ...state, name })),
  setActiveSessionId: (id) =>
    set({
      activeSessionId: id,
    }),
  setMessages: (messages) =>
    set((state) => {
      const newMessages =
        typeof messages === "function" ? messages(state.messages) : messages;
      return { messages: sortMessagesByTimestamp(newMessages) };
    }),
  addMessage: (message) =>
    set((state) => ({
      messages: sortMessagesByTimestamp([...state.messages, message]),
    })),
  setIsTyping: (isTyping) => set({ isTyping }),
  setLoadingState: (loadingState) => set({ loadingState }),
  setIntent: (intent) => set({ intent }),
  setSessions: (sessions) =>
    set((state) => ({
      sessions:
        typeof sessions === "function" ? sessions(state.sessions) : sessions,
    })),
  resetChat: () =>
    set({
      activeSessionId: "",
      messages: [],
      isTyping: false,
      loadingState: "IDLE",
      intent: "",
    }),
}));
