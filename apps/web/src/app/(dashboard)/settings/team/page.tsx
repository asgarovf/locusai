"use client";

import { MembershipRole } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Shield, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components";
import { InviteMemberModal } from "@/components/settings";
import { Avatar, Badge, Button } from "@/components/ui";
import {
  useAuthenticatedUser,
  useInvitationsQuery,
  useOrganizationMembersQuery,
} from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export default function TeamPage() {
  const currentUser = useAuthenticatedUser();
  const { data: members = [], isLoading: membersLoading } =
    useOrganizationMembersQuery();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const isOwner =
    members.find((m) => m.userId === currentUser?.id)?.role ===
    MembershipRole.OWNER;
  const isAdmin =
    members.find((m) => m.userId === currentUser?.id)?.role ===
    MembershipRole.ADMIN;
  const canManage = isOwner || isAdmin;

  const { data: invitations = [], isLoading: invitationsLoading } =
    useInvitationsQuery({ enabled: canManage });

  const handleRemoveMember = async (userId: string) => {
    if (!currentUser?.orgId) return;
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
    if (!currentUser?.orgId) return;

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

  return (
    <PageLayout
      title="Team Management"
      description="Manage your organization members and invitations."
      actions={
        canManage ? (
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus size={18} />
            Invite Member
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-8">
        {/* Members List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Members ({members.length})
            </h3>
          </div>

          <div className="bg-card/50 border border-secondary/20 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No members found.
              </div>
            ) : (
              <div className="divide-y divide-secondary/20">
                {members.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-4 hover:bg-secondary/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={membership.user.avatarUrl}
                        name={membership.user.name}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {membership.user.name}
                          </span>
                          {membership.userId === currentUser?.id && (
                            <Badge variant="info" size="sm">
                              You
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {membership.user.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/30 border border-secondary/20">
                        {membership.role === MembershipRole.OWNER ||
                        membership.role === MembershipRole.ADMIN ? (
                          <Shield size={14} className="text-primary" />
                        ) : null}
                        <span className="text-xs font-medium capitalize">
                          {membership.role.toLowerCase()}
                        </span>
                      </div>

                      {canManage &&
                        membership.userId !== currentUser?.id &&
                        membership.role !== MembershipRole.OWNER && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveMember(membership.userId)
                            }
                            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Pending Invitations */}
        {!isLoading && invitations.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Invitations ({invitations.length})
              </h3>
            </div>

            <div className="bg-card/50 border border-secondary/20 rounded-2xl overflow-hidden">
              <div className="divide-y divide-secondary/20">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 hover:bg-secondary/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Mail size={20} />
                      </div>
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-sm text-muted-foreground">
                          Invited as{" "}
                          <span className="capitalize">
                            {invitation.role.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        Pending
                      </Badge>
                      {canManage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(invitation.token)}
                            className="text-muted-foreground"
                            title="Copy Invitation Link"
                          >
                            <Copy size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRevokeInvitation(invitation.id)
                            }
                            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            title="Revoke Invitation"
                          >
                            <X size={18} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </PageLayout>
  );
}
