"use client";

import { usePathname } from "next/navigation";
import { AuthLayoutUI } from "@/components";
import { LoadingPage } from "@/components/ui";
import { useAuthLayoutLogic } from "@/hooks";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuthLayoutLogic();
  const pathname = usePathname();

  if (isLoading) {
    return <LoadingPage />;
  }

  // Skip the UI wrapper for certain routes like /callback
  if (pathname === "/callback") {
    return <>{children}</>;
  }

  return <AuthLayoutUI>{children}</AuthLayoutUI>;
}
