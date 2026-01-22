/**
 * Login page step components
 * Separate UI components for each step of the login flow
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";

interface LoginEmailStepProps {
  email: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Email entry step for login
 */
export function LoginEmailStep({
  email,
  loading,
  onEmailChange,
  onSubmit,
}: LoginEmailStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="name@example.com"
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
    </form>
  );
}

interface LoginOtpStepProps {
  email: string;
  otp: string;
  loading: boolean;
  onOtpChange: (otp: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

/**
 * OTP verification step for login
 */
export function LoginOtpStep({
  otp,
  loading,
  onOtpChange,
  onSubmit,
  onBack,
}: LoginOtpStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <OtpInput value={otp} onChange={onOtpChange} disabled={loading} />
      <Button
        type="submit"
        className="w-full h-11"
        disabled={loading || otp.length < 6}
      >
        {loading ? "Verifying..." : "Verify Code"}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Change email
        </button>
      </div>
    </form>
  );
}
