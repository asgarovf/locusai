"use client";

import { MessageSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export function ChatSidebar({
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatSidebarProps) {
  const { sessions, activeSessionId } = useChatStore();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-card/50 border-r border-border/50 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-[260px]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border/40">
          <Button
            variant="outline"
            className="flex-1 justify-start gap-2 h-9 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5"
            onClick={onNewChat}
          >
            <Plus size={16} />
            <span className="text-xs">New Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Recent
            </div>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="group relative flex items-center"
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "flex-1 flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-all text-left truncate",
                    session.id === activeSessionId
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <MessageSquare size={16} className="shrink-0 opacity-70" />
                  <span className="truncate">{session.title}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className={cn(
                    "absolute right-2 p-1.5 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity",
                    session.id === activeSessionId && "opacity-100"
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
