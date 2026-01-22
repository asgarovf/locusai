"use client";

import { AuthLayoutUI } from "@/components";
import { LoadingPage } from "@/components/ui";
import { useAuthLayoutLogic } from "@/hooks";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuthLayoutLogic();

  if (isLoading) {
    return <LoadingPage />;
  }

  return <AuthLayoutUI>{children}</AuthLayoutUI>;
}
