/**
 * Pending invitations list component
 * Displays pending invitations with actions
 */

import { type Invitation } from "@locusai/shared";
import { Copy, Mail, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface TeamInvitationsListProps {
  invitations: Invitation[];
  canManage: boolean;
  onCopyLink: (token: string) => void;
  onRevokeInvitation: (invitationId: string) => void;
}

export function TeamInvitationsList({
  invitations,
  canManage,
  onCopyLink,
  onRevokeInvitation,
}: TeamInvitationsListProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
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
                      onClick={() => onCopyLink(invitation.token)}
                      className="text-muted-foreground"
                      title="Copy Invitation Link"
                    >
                      <Copy size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRevokeInvitation(invitation.id)}
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
  );
}
