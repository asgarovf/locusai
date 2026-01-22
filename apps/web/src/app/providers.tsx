"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "@/components/ui/Toast";
import { AuthProvider } from "@/context";
import { QUERY_CONFIG } from "@/lib/constants";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_CONFIG.DEFAULT_STALE_TIME,
            gcTime: QUERY_CONFIG.DEFAULT_GC_TIME,
            retry: QUERY_CONFIG.DEFAULT_RETRY,
            refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
          },
          mutations: {
            retry: QUERY_CONFIG.MUTATION_RETRY,
          },
        },
      })
  );

  const isProduction = process.env.NODE_ENV === "production";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
        {!isProduction && <ReactQueryDevtools initialIsOpen={false} />}
      </AuthProvider>
    </QueryClientProvider>
  );
}
