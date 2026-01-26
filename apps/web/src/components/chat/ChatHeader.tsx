"use client";

import { Menu, SquarePen } from "lucide-react";
import { Button } from "@/components/ui";

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  title: string;
  onNewChat: () => void;
}

export function ChatHeader({
  onToggleSidebar,
  title,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border/40 lg:hidden bg-background/50 backdrop-blur-md sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
        <Menu size={20} />
      </Button>
      <span className="font-semibold text-sm">{title}</span>
      <div className="ml-auto">
        <Button variant="ghost" size="icon" onClick={onNewChat}>
          <SquarePen size={20} />
        </Button>
      </div>
    </div>
  );
}
