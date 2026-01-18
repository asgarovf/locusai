import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6 mx-auto">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src="/logo.png" alt="Locus" width={97.81} height={32} />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-4">
            <Link
              href="/docs"
              className="text-sm font-medium transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Documentation
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
      </div>
    </header>
  );
}
