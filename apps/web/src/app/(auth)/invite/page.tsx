"use client";

import { type Invitation } from "@locusai/shared";
import { UserPlus, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Input, Spinner } from "@/components/ui";
import { locusClient } from "@/lib/api-client";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration state if user doesn't exist
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  const verifyToken = useCallback(async () => {
    if (!token) return;
    try {
      const data = await locusClient.invitations.verify(token);
      setInvitation(data);
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

    setRegistering(true);
    try {
      await locusClient.invitations.accept({
        token,
        name,
        password,
      });

      toast.success(
        "Invitation accepted! Please log in with your credentials."
      );
      router.push(
        `/login?email=${encodeURIComponent(invitation?.email || "")}`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to join";
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-muted-foreground">Verifying invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6">
          <XCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invitation Error</h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Button onClick={() => router.push("/")} variant="secondary">
          Go to Homepage
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
          <UserPlus size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Join Organization
        </h1>
        <p className="text-muted-foreground">
          You've been invited to collaborate on Locus AI.
        </p>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              value={invitation?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full mt-6" disabled={registering}>
            {registering ? <Spinner size="sm" /> : "Accept Invitation"}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        By joining, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="mx-auto" />}>
      <InviteContent />
    </Suspense>
  );
}
