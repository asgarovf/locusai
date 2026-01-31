"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { LoadingPage, showToast } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";
import { setStorageItem } from "@/lib/local-storage";
import { STORAGE_KEYS } from "@/lib/local-storage-keys";

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
          setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token);
          locusClient.setToken(token);

          const userData = await locusClient.auth.getProfile();
          await login(token, userData);
        } catch (error) {
          console.error("Auth callback error:", error);
          showToast.error("Authentication failed. Please try again.");
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
