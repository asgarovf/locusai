"use client";

import { Check, Copy, Globe, Menu, Share2, SquarePen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Modal } from "@/components/ui";
import { InterviewProgress } from "./InterviewProgress";

interface InterviewState {
  isInterviewMode: boolean;
  percentage: number;
  missingFields: string[];
  filledFields: string[];
}

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  title: string;
  onNewChat: () => void;
  isShared?: boolean;
  onShare?: (isShared: boolean) => void;
  isSharing?: boolean;
  sessionId?: string;
  interviewState?: InterviewState;
}

export function ChatHeader({
  onToggleSidebar,
  title,
  onNewChat,
  isShared,
  onShare,
  isSharing,
  sessionId,
  interviewState,
}: ChatHeaderProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${sessionId}`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const showInterviewProgress = interviewState?.isInterviewMode;

  return (
    <div className="flex flex-col border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10">
      {/* Main header row */}
      <div className="flex items-center gap-3 p-4 h-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu size={20} />
        </Button>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm truncate">
            {showInterviewProgress ? "Project Setup" : title}
          </span>
          {isShared && !showInterviewProgress && (
            <span className="text-[10px] text-primary flex items-center gap-1">
              <Globe size={10} /> Publicly shared
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!showInterviewProgress && sessionId && onShare && (
            <>
              <Button
                variant={isShared ? "subtle" : "ghost"}
                size="sm"
                className="gap-2 h-9"
                onClick={() => setIsShareModalOpen(true)}
                isLoading={isSharing}
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">Share</span>
              </Button>

              <Modal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title="Share Chat"
                size="sm"
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Anyone with the link can view this chat.
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Globe
                        size={14}
                        className={
                          isShared ? "text-primary" : "text-muted-foreground"
                        }
                      />
                      <span className="text-sm font-medium">Public access</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isShared ? "primary" : "outline"}
                      onClick={() => onShare(!isShared)}
                      className="h-8 text-xs"
                    >
                      {isShared ? "Shared" : "Share"}
                    </Button>
                  </div>

                  {isShared && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="relative">
                        <input
                          readOnly
                          value={shareUrl}
                          className="w-full bg-secondary/50 border border-border/40 rounded-md px-3 py-1.5 text-xs pr-10 focus:outline-none"
                        />
                        <button
                          onClick={handleCopy}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Modal>
            </>
          )}

          {!showInterviewProgress && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewChat}
              title="New Chat"
            >
              <SquarePen size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Interview progress bar row */}
      {showInterviewProgress && interviewState && (
        <div className="px-4 pb-3">
          <InterviewProgress
            percentage={interviewState.percentage}
            missingFields={interviewState.missingFields}
            filledFields={interviewState.filledFields}
          />
        </div>
      )}
    </div>
  );
}
