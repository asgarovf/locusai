/**
 * Login page step components
 * Separate UI components for each step of the login flow
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { config } from "@/lib/config";

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
          // Point to the initiation endpoint, not the callback
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
