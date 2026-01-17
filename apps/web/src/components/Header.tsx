"use client";

import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center mb-6 py-3">
      <div className="relative flex-1 max-w-md group">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
        />
        <input
          type="text"
          placeholder="Search tasks, docs... (⌘K)"
          className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-background hover:bg-secondary/60"
        />
      </div>
    </header>
  );
}
