"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LoadingPage } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const isExecuted = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (isExecuted.current) return;
      isExecuted.current = true;

      const token = searchParams.get("token");

      if (token) {
        try {
          // Temporarily set the token to fetch user info
          localStorage.setItem("locus_token", token);
          locusClient.setToken(token);

          const userData = await locusClient.auth.getMe();
          await login(token, userData);
        } catch (error) {
          console.error("Auth callback error:", error);
          toast.error("Authentication failed. Please try again.");
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

  return <LoadingPage />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <CallbackHandler />
    </Suspense>
  );
}
