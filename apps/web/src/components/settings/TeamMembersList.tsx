/**
 * Team members list component
 * Displays organization members with actions
 */

import { MembershipRole, type MembershipWithUser } from "@locusai/shared";
import { Shield, Trash2 } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui";

interface TeamMembersListProps {
  members: MembershipWithUser[];
  currentUserId?: string;
  canManage: boolean;
  isLoading: boolean;
  onRemoveMember: (userId: string) => void;
}

export function TeamMembersList({
  members,
  currentUserId,
  canManage,
  isLoading,
  onRemoveMember,
}: TeamMembersListProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No members found.
      </div>
    );
  }

  return (
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
                <span className="font-medium">{membership.user.name}</span>
                {membership.userId === currentUserId && (
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
              membership.userId !== currentUserId &&
              membership.role !== MembershipRole.OWNER && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveMember(membership.userId)}
                  className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={18} />
                </Button>
              )}
          </div>
        </div>
      ))}
    </div>
  );
}
