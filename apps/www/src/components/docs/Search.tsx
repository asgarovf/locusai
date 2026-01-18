"use client";

import { Command } from "cmdk";
import { BookOpen, Code, SearchIcon, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";

export function Search() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const modalContent = open ? (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="flex items-center border-b border-white/10 px-4">
            <SearchIcon className="mr-3 h-5 w-5 shrink-0 text-white/50" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-14 w-full bg-transparent py-3 text-base text-white outline-none placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[320px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-8 text-center text-sm text-white/50">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Documentation"
              className="text-white/40 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <Command.Item
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none aria-selected:bg-white/10 aria-selected:text-white data-disabled:pointer-events-none data-disabled:opacity-50"
                onSelect={() =>
                  runCommand(() => router.push("/docs/getting-started"))
                }
              >
                <BookOpen className="mr-3 h-4 w-4 text-blue-400" />
                <span>Getting Started</span>
              </Command.Item>
              <Command.Item
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none aria-selected:bg-white/10 aria-selected:text-white data-disabled:pointer-events-none data-disabled:opacity-50"
                onSelect={() =>
                  runCommand(() => router.push("/docs/architecture"))
                }
              >
                <Settings className="mr-3 h-4 w-4 text-purple-400" />
                <span>Architecture</span>
              </Command.Item>
              <Command.Item
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none aria-selected:bg-white/10 aria-selected:text-white data-disabled:pointer-events-none data-disabled:opacity-50"
                onSelect={() =>
                  runCommand(() => router.push("/docs/contributing"))
                }
              >
                <Code className="mr-3 h-4 w-4 text-emerald-400" />
                <span>Contributing</span>
              </Command.Item>
            </Command.Group>
            <Command.Group
              heading="Links"
              className="text-white/40 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider mt-2"
            >
              <Command.Item
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none aria-selected:bg-white/10 aria-selected:text-white data-disabled:pointer-events-none data-disabled:opacity-50"
                onSelect={() =>
                  runCommand(() =>
                    window.open("https://github.com/asgarovf/locusai", "_blank")
                  )
                }
              >
                <GithubIcon className="mr-3 h-4 w-4 text-orange-400" />
                <span>GitHub Repository</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-secondary/50 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 w-full md:w-64 justify-start"
      >
        <SearchIcon className="h-4 w-4 shrink-0 opacity-50" />
        <span className="hidden lg:inline-flex">Search documentation...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {mounted && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-labelledby="github-icon-title"
    >
      <title id="github-icon-title">GitHub</title>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0 3 1.5l2.5 2.5c1 .5 1.5 1 2 2z" />
      <path d="M9 22v-4a4.8 4.8 0 0 0-1-3.5c-3 0-6-2-6-5.5.08-1.25.27-2.48 1-3.5-.28-1.15-.28-2.35 0-3.5 0 0 1 0 3 1.5L4 4c1 .5 1.5 1 2 2z" />
    </svg>
  );
}
