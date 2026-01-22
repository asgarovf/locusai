"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  InviteEmailDisplay,
  InviteErrorState,
  InviteExistingUserForm,
  InviteFooter,
  InviteHeader,
  InviteLoadingState,
  InviteLoggedInMessage,
  InviteNewAccountForm,
  InviteUserExistsMessage,
} from "@/components/auth/InviteSteps";
import { Spinner } from "@/components/ui";
import { useInviteForm } from "@/hooks/useInviteForm";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const {
    invitation,
    userExists,
    loading,
    error,
    name,
    isSubmitting,
    isLoggingInAsInvitedUser,
    setName,
    handleJoin,
  } = useInviteForm(token);

  if (loading) {
    return <InviteLoadingState />;
  }

  if (error) {
    return <InviteErrorState error={error} onGoHome={() => router.push("/")} />;
  }

  if (!invitation) {
    return (
      <InviteErrorState
        error="Invitation not found"
        onGoHome={() => router.push("/")}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto py-10 px-4">
      <InviteHeader />

      <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-xl space-y-5">
        <InviteEmailDisplay email={invitation.email} />

        {userExists && !isLoggingInAsInvitedUser ? (
          <InviteUserExistsMessage
            onSignIn={() =>
              router.push(
                `/login?email=${encodeURIComponent(invitation.email)}&redirect=${encodeURIComponent(window.location.href)}`
              )
            }
          />
        ) : (
          <>
            {!userExists && (
              <InviteNewAccountForm
                name={name}
                loading={isSubmitting}
                onNameChange={setName}
                onSubmit={handleJoin}
              />
            )}

            {userExists && isLoggingInAsInvitedUser && (
              <>
                <InviteLoggedInMessage userName={invitation.email} />
                <InviteExistingUserForm
                  loading={isSubmitting}
                  onSubmit={handleJoin}
                />
              </>
            )}
          </>
        )}
      </div>

      <InviteFooter />
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
