/**
 * Hook for invitation acceptance form management
 * Handles token verification and invitation acceptance
 */
"use client";

import { type Invitation } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UseInviteFormReturn {
  invitation: Invitation | null;
  userExists: boolean;
  loading: boolean;
  error: string | null;
  name: string;
  isSubmitting: boolean;
  isLoggingInAsInvitedUser: boolean;
  setName: (name: string) => void;
  handleJoin: (e: React.FormEvent) => Promise<void>;
}

/**
 * Custom hook for managing invitation acceptance
 * Handles token verification and acceptance flow
 */
export function useInviteForm(token: string | null): UseInviteFormReturn {
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verifyToken = useCallback(async () => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }

    try {
      const response = await locusClient.invitations.verify(token);
      setInvitation(response.invitation);
      setUserExists(!!response.userExists);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid or expired invitation";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const isLoggingInAsInvitedUser =
    isAuthenticated && currentUser?.email === invitation?.email;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitation) return;

    setIsSubmitting(true);
    try {
      await locusClient.invitations.accept({
        token,
        name: userExists ? undefined : name,
      });

      toast.success(
        userExists
          ? "Successfully joined organization!"
          : "Account created and organization joined!"
      );

      // Invalidate caches after successful join
      if (isAuthenticated && currentUser?.orgId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.invitations.list(currentUser.orgId),
        });
        // Also invalidate members list to show the new member
        await queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.members(currentUser.orgId),
        });
      }

      return {
        success: true,
        isAuthenticated,
        invitationEmail: invitation.email,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join";
      toast.error(message);
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    invitation,
    userExists,
    loading,
    error,
    name,
    isSubmitting,
    isLoggingInAsInvitedUser,
    setName,
    handleJoin: handleJoin as (e: React.FormEvent) => Promise<void>,
  };
}
