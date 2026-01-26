"use client";

import { Bot, Menu, Mic, Paperclip, Send, SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ArtifactPanel,
  ChatLayout,
  ChatMessage,
  ChatSidebar,
  SuggestedPrompts,
} from "@/components/chat";
import { Artifact, ChatSession, Message } from "@/components/chat/types";
import { Button } from "@/components/ui";
import { useAuth } from "@/context";
import { cn } from "@/lib/utils";

// Mock Data
const MOCK_SESSIONS: ChatSession[] = [
  { id: "1", title: "Sprint Planning Q1", updatedAt: new Date() },
  {
    id: "2",
    title: "API Documentation",
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "3",
    title: "Database Schema Draft",
    updatedAt: new Date(Date.now() - 172800000),
  },
];

const MOCK_ARTIFACT: Artifact = {
  id: "art-1",
  type: "code",
  title: "create-table-users.sql",
  language: "sql",
  content: `-- Create Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Index on Email
CREATE INDEX idx_users_email ON users(email);`,
};

export default function ChatPage() {
  const { user } = useAuth();

  // State
  const [sessions, setSessions] = useState<ChatSession[]>(MOCK_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("1");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Adjust textarea height
  // biome-ignore lint/correctness/useExhaustiveDependencies: Update height on input change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setIsTyping(true);

    // Mock AI Response
    setTimeout(() => {
      const isCodeRequest =
        text.toLowerCase().includes("sql") ||
        text.toLowerCase().includes("code");

      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isCodeRequest
          ? "Here is the SQL schema for the users table you requested. It includes standard fields and an index on email."
          : "I can definitely helps with that. I've analyzed your current workspace context and here is what I suggest...",
        timestamp: new Date(),
        relatedArtifactId: isCodeRequest ? MOCK_ARTIFACT.id : undefined,
      };

      setMessages((prev) => [...prev, responseMessage]);
      setIsTyping(false);

      if (isCodeRequest) {
        setActiveArtifact(MOCK_ARTIFACT);
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
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
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <ChatLayout
      isArtifactOpen={!!activeArtifact}
      sidebar={
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            // In real app, load messages for this ID
            if (id !== activeSessionId) setMessages([]);
            setActiveArtifact(null);
          }}
          onNewChat={handleNewChat}
          onDeleteSession={(id) => {
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeSessionId === id && sessions.length > 0) {
              setActiveSessionId(sessions[0].id);
            }
          }}
        />
      }
      artifactPanel={
        <ArtifactPanel
          isOpen={!!activeArtifact}
          artifact={activeArtifact}
          onClose={() => setActiveArtifact(null)}
        />
      }
    >
      {/* Top Bar (Mobile Toggle & Session info could go here) */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40 lg:hidden bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu size={20} />
        </Button>
        <span className="font-semibold text-sm">
          {sessions.find((s) => s.id === activeSessionId)?.title || "Chat"}
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={handleNewChat}>
            <SquarePen size={20} />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="mt-12 md:mt-20">
              <div className="text-center mb-10 space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-4">
                  <Bot size={24} />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Good afternoon, {user?.name?.split(" ")[0] || "User"}
                </h2>
                <p className="text-muted-foreground">
                  I have context on your 3 workspaces and 12 docs. How can I
                  help?
                </p>
              </div>
              <SuggestedPrompts onSelect={handleSendMessage} />
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  artifact={
                    message.relatedArtifactId === MOCK_ARTIFACT.id
                      ? MOCK_ARTIFACT
                      : undefined
                  }
                  onArtifactClick={(art) => setActiveArtifact(art)}
                />
              ))}
              {isTyping && (
                <ChatMessage
                  message={{
                    id: "typing",
                    role: "assistant",
                    content: "",
                    timestamp: new Date(),
                  }}
                  isTyping={true}
                />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-linear-to-t from-background via-background to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 p-2 bg-card border border-border/60 rounded-xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
            <button
              className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip size={20} />
            </button>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your roadmap, tasks, or docs..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-2 text-sm text-foreground placeholder:text-muted-foreground/60 scrollbar-none"
              rows={1}
            />

            <div className="flex items-center gap-1 pb-1">
              <button
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                title="Use voice"
              >
                <Mic size={20} />
              </button>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                size="icon"
                className={cn(
                  "h-9 w-9 transition-all duration-200",
                  inputValue.trim() ? "opacity-100" : "opacity-50"
                )}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
          <div className="text-center mt-3">
            <p className="text-[10px] text-muted-foreground/60">
              Locus AI may produce inaccurate information about people, places,
              or facts.
            </p>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
