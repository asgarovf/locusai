"use client";

interface ChatLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  artifactPanel: React.ReactNode;
  isArtifactOpen: boolean;
}

export function ChatLayout({
  children,
  sidebar,
  artifactPanel,
  isArtifactOpen,
}: ChatLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {sidebar}

      <main className="flex-1 flex flex-col min-w-0 relative bg-linear-to-b from-background to-secondary/10">
        {children}
      </main>

      {isArtifactOpen && artifactPanel}
    </div>
  );
}
