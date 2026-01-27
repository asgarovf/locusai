/**
 * Registration page step components
 * Separate UI components for each step of the registration flow
 */

import { Button, Input, OtpInput } from "@/components/ui";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

interface RegisterEmailStepProps {
  email: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Email entry step for registration
 */
export function RegisterEmailStep({
  email,
  loading,
  onEmailChange,
  onSubmit,
}: RegisterEmailStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Work Email</label>
        <Input
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={loading}
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending code..." : "Continue with Email"}
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          window.location.href = `${config.NEXT_PUBLIC_API_URL}/auth/google`;
        }}
        disabled={loading}
      >
        <svg
          className="mr-2 h-4 w-4"
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="google"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          />
        </svg>
        Google
      </Button>
    </form>
  );
}

interface RegisterOtpStepProps {
  email: string;
  otp: string;
  loading: boolean;
  onOtpChange: (otp: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

/**
 * OTP verification step for registration
 */
export function RegisterOtpStep({
  email,
  otp,
  loading,
  onOtpChange,
  onSubmit,
  onBack,
}: RegisterOtpStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <OtpInput value={otp} onChange={onOtpChange} disabled={loading} />
        <p className="text-xs text-center text-muted-foreground">
          Sent to <span className="font-semibold text-foreground">{email}</span>
          <button
            type="button"
            onClick={onBack}
            className="ml-2 text-primary hover:underline transition-colors"
          >
            Change
          </button>
        </p>
      </div>
      <Button type="submit" className="w-full h-11" disabled={otp.length < 6}>
        Verify Code
      </Button>
    </form>
  );
}

interface RegisterProfileStepProps {
  name: string;
  userRole: string;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ROLE_OPTIONS = [
  { id: "developer", label: "Developer" },
  { id: "designer", label: "Designer" },
  { id: "product_manager", label: "Product" },
  { id: "other", label: "Other" },
] as const;

/**
 * Profile step for registration
 */
export function RegisterProfileStep({
  name,
  userRole,
  onNameChange,
  onRoleChange,
  onSubmit,
}: RegisterProfileStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground/90">
          What's your name?
        </label>
        <Input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          autoFocus
          className="h-11 bg-secondary/20 border-border/40 focus:bg-background"
        />
      </div>
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground/90">
          What's your role?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onRoleChange(role.id)}
              className={cn(
                "flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all duration-200",
                userRole === role.id
                  ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)]"
                  : "bg-secondary/10 border-border/40 text-muted-foreground hover:border-border hover:bg-secondary/20"
              )}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20"
        disabled={!userRole || !name}
      >
        Continue
      </Button>
    </form>
  );
}

interface RegisterOrganizationStepProps {
  companyName: string;
  teamSize: string;
  onCompanyNameChange: (name: string) => void;
  onTeamSizeChange: (size: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const TEAM_SIZE_OPTIONS = [
  { id: "solo", label: "Solo" },
  { id: "2-10", label: "2-10" },
  { id: "11-50", label: "11-50" },
  { id: "51-200", label: "51-200" },
  { id: "200+", label: "200+" },
] as const;

/**
 * Organization step for registration
 */
export function RegisterOrganizationStep({
  companyName,
  teamSize,
  onCompanyNameChange,
  onTeamSizeChange,
  onSubmit,
}: RegisterOrganizationStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground/90">
          Company Name
        </label>
        <Input
          type="text"
          placeholder="Acme Inc."
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          required
          autoFocus
          className="h-11 bg-secondary/20 border-border/40 focus:bg-background"
        />
      </div>
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground/90">
          Team Size
        </label>
        <div className="grid grid-cols-2 gap-3">
          {TEAM_SIZE_OPTIONS.map((size) => (
            <button
              key={size.id}
              type="button"
              onClick={() => onTeamSizeChange(size.id)}
              className={cn(
                "flex items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all duration-200",
                teamSize === size.id
                  ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_-5px_rgba(var(--primary),0.3)]"
                  : "bg-secondary/10 border-border/40 text-muted-foreground hover:border-border hover:bg-secondary/20"
              )}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20"
        disabled={!teamSize || !companyName}
      >
        Continue
      </Button>
    </form>
  );
}

interface RegisterWorkspaceStepProps {
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Workspace step for registration
 */
export function RegisterWorkspaceStep({
  workspaceName,
  onWorkspaceNameChange,
  onSubmit,
}: RegisterWorkspaceStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground/90">
          Name your first workspace
        </label>
        <p className="text-xs text-muted-foreground/70">
          Workspaces are where your team manages specific projects or
          departments.
        </p>
        <Input
          type="text"
          placeholder="e.g. Engineering, Marketing"
          value={workspaceName}
          onChange={(e) => onWorkspaceNameChange(e.target.value)}
          required
          autoFocus
          className="h-11 bg-secondary/20 border-border/40 focus:bg-background"
        />
      </div>
      <Button
        type="submit"
        className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20"
        disabled={!workspaceName}
      >
        Continue
      </Button>
    </form>
  );
}

interface RegisterInviteStepProps {
  invitedEmails: string[];
  currentInviteEmail: string;
  loading: boolean;
  onCurrentEmailChange: (email: string) => void;
  onAddInvite: () => void;
  onRemoveInvite: (email: string) => void;
  onSkip: () => void;
  onSubmit: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * Invite step for registration
 */
export function RegisterInviteStep({
  invitedEmails,
  currentInviteEmail,
  loading,
  onCurrentEmailChange,
  onAddInvite,
  onRemoveInvite,
  onSkip,
  onSubmit,
  onKeyDown,
}: RegisterInviteStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground/90">
          Invite your team (Optional)
        </label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={currentInviteEmail}
            onChange={(e) => onCurrentEmailChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-11 bg-secondary/20 border-border/40 focus:bg-background"
          />
          <Button
            type="button"
            onClick={onAddInvite}
            variant="secondary"
            className="h-11 px-6"
          >
            Add
          </Button>
        </div>
        {invitedEmails.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {invitedEmails.map((email) => (
              <div
                key={email}
                className="bg-primary/5 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 animate-in zoom-in-95 duration-200"
              >
                {email}
                <button
                  type="button"
                  onClick={() => onRemoveInvite(email)}
                  className="hover:text-primary/70 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pt-4 space-y-3">
        <Button
          onClick={onSubmit}
          className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20"
          disabled={loading}
        >
          {loading ? "Creating your space..." : "Finish Setup"}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full h-11 text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
