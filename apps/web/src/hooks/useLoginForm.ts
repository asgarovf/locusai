/**
 * Hook for login form management
 * Handles OTP flow: email -> OTP verification
 */
"use client";

import { type User } from "@locusai/shared";
import { useState } from "react";
import { showToast } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";

type LoginStep = "email" | "otp";

interface UseLoginFormReturn {
  step: LoginStep;
  email: string;
  otp: string;
  loading: boolean;
  setEmail: (email: string) => void;
  setOtp: (otp: string) => void;
  handleSendOtp: (e: React.FormEvent) => Promise<void>;
  handleVerify: (e: React.FormEvent) => Promise<void>;
  goBackToEmail: () => void;
}

/**
 * Custom hook for managing login form state and logic
 * Separates form logic from UI
 */
export function useLoginForm(): UseLoginFormReturn {
  const { login } = useAuth();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await locusClient.auth.requestLoginOtp(email);
      setStep("otp");
      showToast.success("Verification code sent to your email");
    } catch (error) {
      showToast.error(
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
      await login(response.token, response.user as User);
      showToast.success("Welcome back!");
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep("email");
    setOtp("");
  };

  return {
    step,
    email,
    otp,
    loading,
    setEmail,
    setOtp,
    handleSendOtp,
    handleVerify,
    goBackToEmail,
  };
}
