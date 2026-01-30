import { create } from "zustand";
import { Artifact, ChatSession, Message } from "@/components/chat/types";

interface ChatState {
  activeSessionId: string;
  messages: Message[];
  isTyping: boolean;
  loadingState: "IDLE" | "DETECTING" | "EXECUTING";
  intent: string;
  sessions: ChatSession[];
  activeArtifact: Artifact | null;

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
  setActiveArtifact: (artifact: Artifact | null) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeSessionId: "",
  messages: [],
  isTyping: false,
  loadingState: "IDLE",
  intent: "",
  sessions: [],
  activeArtifact: null,

  setName: (name) => set((state) => ({ ...state, name })),
  setActiveSessionId: (id) =>
    set({
      activeSessionId: id,
    }),
  setMessages: (messages) =>
    set((state) => ({
      messages:
        typeof messages === "function" ? messages(state.messages) : messages,
    })),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setIsTyping: (isTyping) => set({ isTyping }),
  setLoadingState: (loadingState) => set({ loadingState }),
  setIntent: (intent) => set({ intent }),
  setSessions: (sessions) =>
    set((state) => ({
      sessions:
        typeof sessions === "function" ? sessions(state.sessions) : sessions,
    })),
  setActiveArtifact: (activeArtifact) => set({ activeArtifact }),
  resetChat: () =>
    set({
      activeSessionId: "",
      messages: [],
      isTyping: false,
      loadingState: "IDLE",
      intent: "",
      activeArtifact: null,
    }),
}));
