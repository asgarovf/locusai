"use client";

import { type User } from "@locusai/shared";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { StepProgress } from "@/components/onboarding";
import { Button, Input, OtpInput } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Step =
  | "email"
  | "otp"
  | "profile"
  | "organization"
  | "workspace"
  | "invite";

export default function RegisterPage() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [currentInviteEmail, setCurrentInviteEmail] = useState("");

  const steps: Step[] = [
    "email",
    "otp",
    "profile",
    "organization",
    "workspace",
    "invite",
  ];
  const currentStepIndex = steps.indexOf(step) + 1;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await locusClient.auth.requestRegisterOtp(email);
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

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setStep("profile");
    } else {
      toast.error("Please enter a valid 6-digit code");
    }
  };

  const handleAddInvite = () => {
    if (currentInviteEmail && !invitedEmails.includes(currentInviteEmail)) {
      if (currentInviteEmail.includes("@")) {
        setInvitedEmails([...invitedEmails, currentInviteEmail]);
        setCurrentInviteEmail("");
      } else {
        toast.error("Invalid email address");
      }
    }
  };

  const removeInvite = (emailToRemove: string) => {
    setInvitedEmails(invitedEmails.filter((e) => e !== emailToRemove));
  };

  const handleCompleteRegistration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        invitedEmails: invitedEmails.length > 0 ? invitedEmails : undefined,
      });
      login(response.token, response.user as User);
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Work Email</label>
              <Input
                type="email"
                placeholder="name@company.com"
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
        );

      case "otp":
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              <p className="text-xs text-center text-muted-foreground">
                Sent to{" "}
                <span className="font-semibold text-foreground">{email}</span>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="ml-2 text-primary hover:underline transition-colors"
                >
                  Change
                </button>
              </p>
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={otp.length < 6}
            >
              Verify Code
            </Button>
          </form>
        );

      case "profile":
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("organization");
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/90">
                What's your name?
              </label>
              <Input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                {[
                  { id: "developer", label: "Developer" },
                  { id: "designer", label: "Designer" },
                  { id: "product_manager", label: "Product" },
                  { id: "other", label: "Other" },
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setUserRole(role.id)}
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

      case "organization":
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("workspace");
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/90">
                Company Name
              </label>
              <Input
                type="text"
                placeholder="Acme Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
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
                {[
                  { id: "solo", label: "Solo" },
                  { id: "2-10", label: "2-10" },
                  { id: "11-50", label: "11-50" },
                  { id: "51-200", label: "51-200" },
                  { id: "200+", label: "200+" },
                ].map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setTeamSize(size.id)}
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

      case "workspace":
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("invite");
            }}
            className="space-y-6"
          >
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
                onChange={(e) => setWorkspaceName(e.target.value)}
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

      case "invite":
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
                  onChange={(e) => setCurrentInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddInvite()}
                  className="h-11 bg-secondary/20 border-border/40 focus:bg-background"
                />
                <Button
                  type="button"
                  onClick={handleAddInvite}
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
                        onClick={() => removeInvite(email)}
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
                onClick={() => handleCompleteRegistration()}
                className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? "Creating your space..." : "Finish Setup"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleCompleteRegistration()}
                className="w-full h-11 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                Skip for now
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
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

      {step !== "email" && step !== "otp" && (
        <StepProgress currentStep={currentStepIndex - 2} totalSteps={4} />
      )}

      {renderStep()}

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
