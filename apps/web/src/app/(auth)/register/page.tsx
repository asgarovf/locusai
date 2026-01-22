"use client";

import Link from "next/link";
import {
  RegisterEmailStep,
  RegisterInviteStep,
  RegisterOrganizationStep,
  RegisterOtpStep,
  RegisterProfileStep,
  RegisterWorkspaceStep,
} from "@/components/auth/RegisterSteps";
import { StepProgress } from "@/components/onboarding";
import { useRegisterForm } from "@/hooks/useRegisterForm";

export default function RegisterPage() {
  const {
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
    setEmail,
    setOtp,
    setName,
    setCompanyName,
    setTeamSize,
    setUserRole,
    setWorkspaceName,
    setCurrentInviteEmail,
    goToStep,
    handleSendOtp,
    handleVerifyOtp,
    handleAddInvite,
    handleRemoveInvite,
    handleCompleteRegistration,
  } = useRegisterForm();

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <RegisterEmailStep
            email={email}
            loading={loading}
            onEmailChange={setEmail}
            onSubmit={handleSendOtp}
          />
        );

      case "otp":
        return (
          <RegisterOtpStep
            email={email}
            otp={otp}
            loading={loading}
            onOtpChange={setOtp}
            onSubmit={handleVerifyOtp}
            onBack={() => goToStep("email")}
          />
        );

      case "profile":
        return (
          <RegisterProfileStep
            name={name}
            userRole={userRole}
            onNameChange={setName}
            onRoleChange={setUserRole}
            onSubmit={(e) => {
              e.preventDefault();
              goToStep("organization");
            }}
          />
        );

      case "organization":
        return (
          <RegisterOrganizationStep
            companyName={companyName}
            teamSize={teamSize}
            onCompanyNameChange={setCompanyName}
            onTeamSizeChange={setTeamSize}
            onSubmit={(e) => {
              e.preventDefault();
              goToStep("workspace");
            }}
          />
        );

      case "workspace":
        return (
          <RegisterWorkspaceStep
            workspaceName={workspaceName}
            onWorkspaceNameChange={setWorkspaceName}
            onSubmit={(e) => {
              e.preventDefault();
              goToStep("invite");
            }}
          />
        );

      case "invite":
        return (
          <RegisterInviteStep
            invitedEmails={invitedEmails}
            currentInviteEmail={currentInviteEmail}
            loading={loading}
            onCurrentEmailChange={setCurrentInviteEmail}
            onAddInvite={handleAddInvite}
            onRemoveInvite={handleRemoveInvite}
            onSkip={() => handleCompleteRegistration()}
            onSubmit={() => handleCompleteRegistration()}
            onKeyDown={(e) => e.key === "Enter" && handleAddInvite()}
          />
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {step === "invite" ? "Bring your team" : "Create your account"}
        </h2>
        <p className="text-sm text-muted-foreground/80">
          {step === "email" && "Experience the future of task management."}
          {step === "otp" && "We've sent a 6-digit code to your email."}
          {step === "profile" && "Let's personalize your experience."}
          {step === "organization" && "Tell us about your company."}
          {step === "workspace" && "Create your first collaborative space."}
          {step === "invite" && "Collaboration is better together."}
        </p>
      </div>

      {/* Progress indicator for main steps (not email/otp) */}
      {step !== "email" && step !== "otp" && (
        <StepProgress currentStep={currentStepIndex - 2} totalSteps={4} />
      )}

      {/* Render current step */}
      {renderStep()}

      {/* Footer for email step */}
      {step === "email" && (
        <div className="text-center text-sm text-muted-foreground/50 mt-8">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
