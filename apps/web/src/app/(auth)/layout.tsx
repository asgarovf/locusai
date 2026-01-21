"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingPage } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { isCloudMode } from "@/utils/env.utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const pathname = usePathname();

  useEffect(() => {
    if (
      !isLoading &&
      isAuthenticated &&
      isCloudMode() &&
      !pathname.startsWith("/onboarding")
    ) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading && isCloudMode()) {
    return <LoadingPage />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-8 w-[98px] mb-2">
            <Image
              src="/logo.png"
              alt="Locus AI Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/30">
            Intelligent Task Management
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
