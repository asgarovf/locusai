"use client";

import { MembershipRole } from "@locusai/shared";
import { useState } from "react";
import { CreateModal } from "@/components/CreateModal";
import { Input } from "@/components/ui";
import { useAuthenticatedUserWithOrg } from "@/hooks";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>(MembershipRole.MEMBER);
  const user = useAuthenticatedUserWithOrg();

  const sendInvitation = useMutationWithToast({
    mutationFn: (data: { email: string; role: MembershipRole }) =>
      locusClient.invitations.create(user.orgId, {
        email: data.email,
        role: data.role,
        orgId: user.orgId,
      }),
    successMessage: `Invitation sent to ${email}`,
    invalidateKeys: [queryKeys.invitations.list(user.orgId)],
    onSuccess: () => {
      setEmail("");
      setRole(MembershipRole.MEMBER);
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.orgId || !email) return;
    sendInvitation.mutate({ email, role });
  };

  const roleDescription =
    role === MembershipRole.ADMIN
      ? "Admins can manage tasks, sprints, and other members."
      : "Members can view and manage tasks and sprints.";

  return (
    <CreateModal
      isOpen={isOpen}
      title="Invite Team Member"
      size="sm"
      fields={[
        {
          name: "email",
          label: "Email Address",
          component: (
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          ),
          required: true,
        },
        {
          name: "role",
          label: "Role",
          component: (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[MembershipRole.MEMBER, MembershipRole.ADMIN].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm transition-all",
                      role === r
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-secondary hover:bg-secondary/50"
                    )}
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1 px-1">
                {roleDescription}
              </p>
            </div>
          ),
        },
      ]}
      onSubmit={handleSubmit}
      onClose={onClose}
      submitText="Send Invitation"
      isPending={sendInvitation.isPending}
      submitDisabled={!email.trim() || !user.orgId}
    />
  );
}
