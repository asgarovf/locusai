"use client";

import { UserPlus } from "lucide-react";
import { PageLayout } from "@/components";
import { InviteMemberModal } from "@/components/settings";
import { TeamInvitationsList } from "@/components/settings/TeamInvitationsList";
import { TeamMembersList } from "@/components/settings/TeamMembersList";
import { Button } from "@/components/ui";
import { useTeamManagement } from "@/hooks/useTeamManagement";

export default function TeamPage() {
  const {
    currentUser,
    members,
    invitations,
    isLoading,
    canManage,
    isInviteModalOpen,
    setIsInviteModalOpen,
    handleRemoveMember,
    handleRevokeInvitation,
    handleCopyLink,
  } = useTeamManagement();

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
            <TeamMembersList
              members={members}
              currentUserId={currentUser.id}
              canManage={canManage}
              isLoading={isLoading}
              onRemoveMember={handleRemoveMember}
            />
          </div>
        </section>

        {/* Pending Invitations */}
        {!isLoading && (
          <TeamInvitationsList
            invitations={invitations}
            canManage={canManage}
            onCopyLink={handleCopyLink}
            onRevokeInvitation={handleRevokeInvitation}
          />
        )}
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </PageLayout>
  );
}
