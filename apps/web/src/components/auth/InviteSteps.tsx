/**
 * Invitation acceptance page components
 * Separate UI components for invite states
 */

import { LogIn, UserPlus, XCircle } from "lucide-react";
import { SecondaryText } from "@/components/typography";
import { Button, Input, Spinner } from "@/components/ui";

/**
 * Loading state for invitation verification
 */
export function InviteLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner size="lg" className="mb-4" />
      <p className="text-muted-foreground animate-pulse text-sm">
        Verifying invitation...
      </p>
    </div>
  );
}

interface InviteErrorStateProps {
  error: string;
  onGoHome: () => void;
}

/**
 * Error state for invitation errors
 */
export function InviteErrorState({ error, onGoHome }: InviteErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <XCircle size={24} />
      </div>
      <h1 className="text-xl font-bold mb-2">Invitation Error</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{error}</p>
      <Button onClick={onGoHome} variant="secondary" size="sm">
        Go to Homepage
      </Button>
    </div>
  );
}

/**
 * Header section for invitation page
 */
export function InviteHeader() {
  return (
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
  );
}

interface InviteEmailDisplayProps {
  email: string;
}

/**
 * Email display section
 */
export function InviteEmailDisplay({ email }: InviteEmailDisplayProps) {
  return (
    <div className="space-y-1.5">
      <SecondaryText as="label" size="xs" className="px-1">
        Email Address
      </SecondaryText>
      <div className="h-11 flex items-center px-4 bg-secondary/30 border border-secondary/50 rounded-xl text-foreground font-medium text-sm overflow-hidden text-ellipsis whitespace-nowrap">
        {email}
      </div>
    </div>
  );
}

interface InviteNewAccountFormProps {
  name: string;
  loading: boolean;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Form for new user accepting invitation
 */
export function InviteNewAccountForm({
  name,
  loading,
  onNameChange,
  onSubmit,
}: InviteNewAccountFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <SecondaryText as="label" size="xs" className="px-1">
          Full Name
        </SecondaryText>
        <Input
          placeholder="e.g. Alex Rivera"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-11 text-sm rounded-xl bg-background/50 border-secondary focus:border-primary"
          required
          autoFocus
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
        disabled={loading}
      >
        {loading ? <Spinner size="sm" /> : "Create Account & Join"}
      </Button>
    </form>
  );
}

interface InviteExistingUserFormProps {
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Form for existing user accepting invitation
 */
export function InviteExistingUserForm({
  loading,
  onSubmit,
}: InviteExistingUserFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Button
        type="submit"
        className="w-full h-12 text-sm font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
        disabled={loading}
      >
        {loading ? <Spinner size="sm" /> : "Join Now"}
      </Button>
    </form>
  );
}

interface InviteUserExistsMessageProps {
  onSignIn: () => void;
}

/**
 * Message when email already exists
 */
export function InviteUserExistsMessage({
  onSignIn,
}: InviteUserExistsMessageProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
        <p className="text-xs leading-relaxed text-muted-foreground">
          An account with this email already exists. Sign in to accept.
        </p>
      </div>
      <Button
        onClick={onSignIn}
        className="w-full h-11 text-sm font-bold rounded-xl transition-all"
        variant="primary"
      >
        <LogIn size={18} className="mr-2" />
        Sign in to Continue
      </Button>
    </div>
  );
}

interface InviteLoggedInMessageProps {
  userName: string;
}

/**
 * Message when user is already logged in as the invited user
 */
export function InviteLoggedInMessage({
  userName,
}: InviteLoggedInMessageProps) {
  return (
    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <p className="text-[11px] font-medium text-emerald-600/80">
        Logged in as <span className="text-emerald-600">{userName}</span>
      </p>
    </div>
  );
}

/**
 * Footer with terms and privacy
 */
export function InviteFooter() {
  return (
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
  );
}
