"use client";

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

interface UseMutationWithToastConfig<T, DTO> {
  mutationFn: (data: DTO) => Promise<T>;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  invalidateKeys?: QueryKey[];
}

/**
 * Enhanced mutation hook with automatic toast notifications and query invalidation.
 *
 * Handles common mutation patterns:
 * - Success/error toast notifications
 * - Automatic query cache invalidation
 * - Consistent error handling
 *
 * @example
 * const mutation = useMutationWithToast({
 *   mutationFn: (data) => api.create(data),
 *   successMessage: "Created successfully",
 *   invalidateKeys: [queryKeys.items.all()],
 *   onSuccess: () => closeModal(),
 * });
 */
export function useMutationWithToast<T, DTO = void>({
  mutationFn,
  successMessage = "Success",
  errorMessage,
  onSuccess,
  invalidateKeys = [],
}: UseMutationWithToastConfig<T, DTO>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      toast.success(successMessage);
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(errorMessage ?? error.message ?? "An error occurred");
    },
  });
}
