import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "@/components/docs";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui";
import { getAllDocs } from "@/lib/docs";

const docs = getAllDocs(["title", "slug"]);

export function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6 mx-auto relative justify-between">
        {/* Left: Logo */}
        <div className="flex items-center shrink-0">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src="/logo.png" alt="Locus" width={97.81} height={36.09} />
          </Link>
        </div>

        {/* Center: Search */}
        <div className="flex-1 md:flex-none flex justify-center w-full md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-auto px-4 md:px-0">
          <Search docs={docs} />
        </div>

        {/* Right: Nav */}
        <div className="hidden md:flex items-center justify-end shrink-0 space-x-4">
          <nav className="flex items-center space-x-4">
            <Link
              href="/docs"
              className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Documentation
            </Link>
            <Link
              href="https://app.locusai.dev"
              className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
            <Link
              href="https://github.com/asgarovf/locusai"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 px-0">
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Button>
            </Link>
          </nav>
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
