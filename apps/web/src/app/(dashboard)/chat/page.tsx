"use client";

import { useState } from "react";
import {
  ArtifactPanel,
  ChatEmptyState,
  ChatHeader,
  ChatInput,
  ChatLayout,
  ChatMessage,
  ChatSidebar,
  ChatSuggestions,
} from "@/components/chat";
import {
  type AssistantMessage,
  type SuggestedAction,
} from "@/components/chat/types";
import { useChat } from "@/hooks/useChat";

export default function ChatPage() {
  const {
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
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleNewChat = () => {
    createNewChat();
    // Close sidebar on mobile when creating new chat
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const lastMessage = messages[messages.length - 1];

  const suggestions =
    (lastMessage && (lastMessage as AssistantMessage).suggestedActions) || [];

  return (
    <ChatLayout
      isArtifactOpen={!!activeArtifact}
      sidebar={
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={deleteSession}
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
      <ChatHeader
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        title={sessions.find((s) => s.id === activeSessionId)?.title || "Chat"}
        onNewChat={handleNewChat}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <ChatEmptyState onSelectPrompt={sendMessage} />
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  // For now, only show artifact if specifically attached or in new artifacts array
                  artifact={
                    message.role === "assistant" && message.artifacts?.length
                      ? message.artifacts[0]
                      : undefined
                  }
                  onArtifactClick={(art) => setActiveArtifact(art)}
                />
              ))}

              {/* Suggested Actions for the last AI message */}
              {!isTyping &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" &&
                (messages[messages.length - 1] as AssistantMessage)
                  .suggestedActions && (
                  <ChatSuggestions
                    suggestions={suggestions}
                    onSelect={(suggestion: SuggestedAction) => {
                      if (suggestion.type === "chat_suggestion") {
                        sendMessage(suggestion.payload.text);
                      }
                    }}
                    className="mt-2"
                  />
                )}

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

      <ChatInput onSendMessage={sendMessage} isLoading={isTyping} />
    </ChatLayout>
  );
}
