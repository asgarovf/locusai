"use client";

import Link from "next/link";
import { LoginEmailStep, LoginOtpStep } from "@/components/auth/LoginSteps";
import { useLoginForm } from "@/hooks/useLoginForm";

export default function LoginPage() {
  const {
    step,
    email,
    otp,
    loading,
    setEmail,
    setOtp,
    handleSendOtp,
    handleVerify,
    goBackToEmail,
  } = useLoginForm();

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Steps */}
      {step === "email" ? (
        <LoginEmailStep
          email={email}
          loading={loading}
          onEmailChange={setEmail}
          onSubmit={handleSendOtp}
        />
      ) : (
        <LoginOtpStep
          email={email}
          otp={otp}
          loading={loading}
          onOtpChange={setOtp}
          onSubmit={handleVerify}
          onBack={goBackToEmail}
        />
      )}

      {/* Footer */}
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
