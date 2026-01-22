/**
 * Hook for team management logic
 * Handles members, invitations, and member operations
 */
"use client";

import { MembershipRole } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAuthenticatedUserWithOrg,
  useInvitationsQuery,
  useOrganizationMembersQuery,
} from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useTeamManagement() {
  const currentUser = useAuthenticatedUserWithOrg();
  const { data: members = [], isLoading: membersLoading } =
    useOrganizationMembersQuery();
  const queryClient = useQueryClient();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Determine user's role
  const userMembership = members.find((m) => m.userId === currentUser?.id);
  const isOwner = userMembership?.role === MembershipRole.OWNER;
  const isAdmin = userMembership?.role === MembershipRole.ADMIN;
  const canManage = isOwner || isAdmin;

  const { data: invitations = [], isLoading: invitationsLoading } =
    useInvitationsQuery({ enabled: canManage });

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await locusClient.organizations.removeMember(currentUser.orgId, userId);
      toast.success("Member removed");
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.members(currentUser.orgId),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await locusClient.invitations.revoke(currentUser.orgId, invitationId);
      toast.success("Invitation revoked");
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.list(currentUser.orgId),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke invitation"
      );
    }
  };

  const handleCopyLink = (token: string) => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://app.locusai.dev";
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invitation link copied to clipboard");
  };

  const isLoading = membersLoading || invitationsLoading;

  return {
    currentUser,
    members,
    invitations,
    isLoading,
    isOwner,
    isAdmin,
    canManage,
    isInviteModalOpen,
    setIsInviteModalOpen,
    handleRemoveMember,
    handleRevokeInvitation,
    handleCopyLink,
  };
}
