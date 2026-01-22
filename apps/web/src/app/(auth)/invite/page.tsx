"use client";

import { type Invitation } from "@locusai/shared";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, UserPlus, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/context";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = searchParams.get("token");
  const { user: currentUser, isAuthenticated } = useAuth();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Name state for new users
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const verifyToken = useCallback(async () => {
    if (!token) return;
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
    if (token) {
      verifyToken();
    } else {
      setError("No invitation token provided");
      setLoading(false);
    }
  }, [token, verifyToken]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

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

      // Invalidate invitations cache for all orgs if user is authenticated
      if (isAuthenticated && currentUser?.orgId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.invitations.list(currentUser.orgId),
        });
        // Also invalidate members list to show the new member
        await queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.members(currentUser.orgId),
        });
      }

      if (isAuthenticated) {
        router.push("/");
      } else {
        router.push(
          `/login?email=${encodeURIComponent(invitation?.email || "")}`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" className="mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">
          Verifying invitation...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <XCircle size={24} />
        </div>
        <h1 className="text-xl font-bold mb-2">Invitation Error</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{error}</p>
        <Button onClick={() => router.push("/")} variant="secondary" size="sm">
          Go to Homepage
        </Button>
      </div>
    );
  }

  const isLoggingInAsInvitedUser =
    isAuthenticated && currentUser?.email === invitation?.email;

  return (
    <div className="max-w-sm mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 shadow-inner">
          <UserPlus size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">
          Join Locus
        </h1>
        <p className="text-xs text-muted-foreground px-4">
          You've been invited to collab on Locus AI.
        </p>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">
            Email Address
          </label>
          <div className="h-11 flex items-center px-4 bg-secondary/30 border border-secondary/50 rounded-xl text-foreground font-medium text-sm overflow-hidden text-ellipsis whitespace-nowrap">
            {invitation?.email}
          </div>
        </div>

        {userExists && !isLoggingInAsInvitedUser ? (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
              <p className="text-xs leading-relaxed text-muted-foreground">
                An account with this email already exists. Sign in to accept.
              </p>
            </div>
            <Button
              onClick={() =>
                router.push(
                  `/login?email=${encodeURIComponent(invitation?.email || "")}&redirect=${encodeURIComponent(window.location.href)}`
                )
              }
              className="w-full h-11 text-sm font-bold rounded-xl transition-all"
              variant="primary"
            >
              <LogIn size={18} className="mr-2" />
              Sign in to Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            {!userExists && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1">
                  Full Name
                </label>
                <Input
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 text-sm rounded-xl bg-background/50 border-secondary focus:border-primary"
                  required
                  autoFocus
                />
              </div>
            )}

            {userExists && isLoggingInAsInvitedUser && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[11px] font-medium text-emerald-600/80">
                  Logged in as{" "}
                  <span className="text-emerald-600">{currentUser?.name}</span>
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : userExists ? (
                "Join Now"
              ) : (
                "Create Account & Join"
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground/50 mt-8 max-w-[200px] mx-auto leading-normal">
        By joining, you agree to our{" "}
        <span className="underline cursor-pointer hover:text-foreground">
          Terms
        </span>{" "}
        and{" "}
        <span className="underline cursor-pointer hover:text-foreground">
          Privacy Policy
        </span>
        .
      </p>
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
