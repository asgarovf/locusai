/**
 * Hook for registration form management
 * Handles 6-step registration flow with email, OTP, profile, organization, workspace, and invites
 */
"use client";

import { type User } from "@locusai/shared";
import { useState } from "react";
import { showToast } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";
import { deduplicateEmails, validateInvitationEmails } from "@/lib/validation";

type RegisterStep =
  | "email"
  | "otp"
  | "profile"
  | "organization"
  | "workspace"
  | "invite";

interface UseRegisterFormReturn {
  step: RegisterStep;
  loading: boolean;
  email: string;
  otp: string;
  name: string;
  companyName: string;
  teamSize: string;
  userRole: string;
  workspaceName: string;
  invitedEmails: string[];
  currentInviteEmail: string;
  currentStepIndex: number;
  totalSteps: number;
  setEmail: (email: string) => void;
  setOtp: (otp: string) => void;
  setName: (name: string) => void;
  setCompanyName: (name: string) => void;
  setTeamSize: (size: string) => void;
  setUserRole: (role: string) => void;
  setWorkspaceName: (name: string) => void;
  setCurrentInviteEmail: (email: string) => void;
  goToStep: (step: RegisterStep) => void;
  nextStep: () => void;
  handleSendOtp: (e: React.FormEvent) => Promise<void>;
  handleVerifyOtp: (e: React.FormEvent) => void;
  handleAddInvite: () => void;
  handleRemoveInvite: (email: string) => void;
  handleCompleteRegistration: (e?: React.FormEvent) => Promise<void>;
}

/**
 * Custom hook for managing multi-step registration form
 * Separates form logic from UI components
 */
export function useRegisterForm(): UseRegisterFormReturn {
  const { login } = useAuth();
  const [step, setStep] = useState<RegisterStep>("email");
  const [loading, setLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [currentInviteEmail, setCurrentInviteEmail] = useState("");

  const steps: RegisterStep[] = [
    "email",
    "otp",
    "profile",
    "organization",
    "workspace",
    "invite",
  ];
  const currentStepIndex = steps.indexOf(step) + 1;
  const totalSteps = steps.length;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await locusClient.auth.requestRegisterOtp(email);
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

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setStep("profile");
    } else {
      showToast.error("Please enter a valid 6-digit code");
    }
  };

  const handleAddInvite = () => {
    if (!currentInviteEmail.trim()) {
      showToast.error("Please enter an email address");
      return;
    }

    if (currentInviteEmail.includes("@")) {
      const normalized = currentInviteEmail.toLowerCase();
      if (invitedEmails.includes(normalized)) {
        showToast.error("Email already added");
        return;
      }
      setInvitedEmails([...invitedEmails, normalized]);
      setCurrentInviteEmail("");
    } else {
      showToast.error("Invalid email address");
    }
  };

  const handleRemoveInvite = (emailToRemove: string) => {
    setInvitedEmails(invitedEmails.filter((e) => e !== emailToRemove));
  };

  const handleCompleteRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate invites
    const { valid: validEmails, invalid: invalidEmails } =
      validateInvitationEmails(invitedEmails);

    if (invalidEmails.length > 0) {
      showToast.error(`Invalid email addresses: ${invalidEmails.join(", ")}`);
      return;
    }

    // Deduplicate emails
    const deduped = deduplicateEmails(validEmails);

    setLoading(true);
    try {
      const response = await locusClient.auth.completeRegistration({
        email,
        otp,
        name,
        companyName: companyName || undefined,
        teamSize: teamSize as "solo" | "2-10" | "11-50" | "51-200" | "200+",
        userRole: userRole as
          | "developer"
          | "designer"
          | "product_manager"
          | "other",
        workspaceName: workspaceName || undefined,
        invitedEmails: deduped.length > 0 ? deduped : undefined,
      });

      await login(response.token, response.user as User);
      showToast.success("Account created successfully!");
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (newStep: RegisterStep) => {
    setStep(newStep);
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  return {
    step,
    loading,
    email,
    otp,
    name,
    companyName,
    teamSize,
    userRole,
    workspaceName,
    invitedEmails,
    currentInviteEmail,
    currentStepIndex,
    totalSteps,
    setEmail,
    setOtp,
    setName,
    setCompanyName,
    setTeamSize,
    setUserRole,
    setWorkspaceName,
    setCurrentInviteEmail,
    goToStep,
    nextStep,
    handleSendOtp,
    handleVerifyOtp,
    handleAddInvite,
    handleRemoveInvite,
    handleCompleteRegistration,
  };
}
