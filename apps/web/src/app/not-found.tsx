"use client";

import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { getTypographyClass } from "@/lib/typography";
import { cn } from "@/lib/utils";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-20" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Large 404 Text */}
        <h1 className="text-[150px] font-black leading-none bg-linear-to-b from-foreground to-foreground/20 bg-clip-text text-transparent select-none tracking-tighter">
          404
        </h1>

        {/* Message */}
        <h2 className={cn(getTypographyClass("h2"), "mt-4 mb-2")}>
          Page not found
        </h2>
        <p
          className={cn(
            getTypographyClass("body"),
            "max-w-[500px] mb-8 text-muted-foreground"
          )}
        >
          Sorry, we couldn't find the page you're looking for. It might have
          been removed, deleted, or possibly never existed.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={16} />
            Go Back
          </Button>

          <Link href="/">
            <Button>
              <Home size={16} />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
