"use client";

import { Suspense, useState } from "react";
import {
  ChatEmptyState,
  ChatHeader,
  ChatInput,
  ChatMessage,
  ChatSidebar,
  ChatSuggestions,
} from "@/components/chat";
import {
  type AssistantMessage,
  type SuggestedAction,
} from "@/components/chat/types";
import { useInterviewPersistence, useManifestCompletion } from "@/hooks";
import { useChat } from "@/hooks/useChat";

function ChatPageContent() {
  const {
    sessions,
    isLoadingHistory,
    activeSessionId,
    messages,
    isTyping,
    messagesEndRef,
    sendMessage,
    createNewChat,
    deleteSession,
    selectSession,
    loadingState,
    intent,
    shareSession,
    isSharing,
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Get manifest completion status for interview progress display
  const { isComplete, percentage, missingFields, filledFields } =
    useManifestCompletion();

  // Interview chat persistence - backs up messages during interview
  useInterviewPersistence({
    messages,
    sessionId: activeSessionId,
  });

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

  // Show interview progress only when manifest is incomplete
  const interviewState = !isComplete
    ? {
        isInterviewMode: true,
        percentage,
        missingFields,
        filledFields,
      }
    : undefined;

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <div id="chat-sidebar-toggle">
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={deleteSession}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 relative bg-linear-to-b from-background to-secondary/10">
        <ChatHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          title={
            sessions.find((s) => s.id === activeSessionId)?.title || "Chat"
          }
          onNewChat={handleNewChat}
          isShared={sessions.find((s) => s.id === activeSessionId)?.isShared}
          onShare={(isShared) => shareSession(activeSessionId, isShared)}
          isSharing={isSharing}
          sessionId={activeSessionId}
          interviewState={interviewState}
        />

        <div
          id="chat-context"
          className="flex-1 overflow-y-auto p-4 md:px-8 lg:px-12 scrollbar-thin"
        >
          <div className="max-w-5xl mx-auto space-y-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : messages.length === 0 ? (
              <ChatEmptyState
                onSelectPrompt={(prompt) => setInputValue(prompt)}
              />
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
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
                          setInputValue(suggestion.payload.text);
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
                    loadingState={loadingState}
                    intent={intent}
                  />
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div id="chat-input">
          <ChatInput
            onSendMessage={sendMessage}
            isLoading={isTyping}
            value={inputValue}
            onValueChange={setInputValue}
          />
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
