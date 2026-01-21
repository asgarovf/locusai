"use client";

import { type User } from "@locusai/shared";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";

export default function LoginPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await locusClient.auth.requestLoginOtp(email);
      setStep("otp");
      toast.success("Verification code sent to your email");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await locusClient.auth.verifyLogin({ email, otp });
      login(response.token, response.user as User);
      toast.success("Welcome back!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Sign in
        </h2>
        <p className="text-sm text-muted-foreground/80">
          {step === "email"
            ? "Enter your email to access your workspace"
            : `We've sent a code to ${email}`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending code..." : "Continue with Email"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
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
              onClick={() => setStep("email")}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Change email
            </button>
          </div>
        </form>
      )}

      <div className="text-center text-sm text-muted-foreground/50">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
