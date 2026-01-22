/**
 * Authentication validation schemas and utilities
 * Centralized validation for login, register, and invite flows
 */

import { z } from "zod";

/**
 * Email validation - used across all auth flows
 */
export const EmailSchema = z
  .string()
  .email("Invalid email address")
  .toLowerCase();

/**
 * OTP validation - 6-digit code
 */
export const OtpSchema = z.string().regex(/^\d{6}$/, "OTP must be 6 digits");

/**
 * User name validation
 */
export const NameSchema = z
  .string()
  .min(1, "Name is required")
  .max(255, "Name must be less than 255 characters");

/**
 * Company/organization name validation
 */
export const CompanyNameSchema = z
  .string()
  .min(1, "Company name is required")
  .max(255, "Company name must be less than 255 characters");

/**
 * Workspace name validation
 */
export const WorkspaceNameSchema = z
  .string()
  .min(1, "Workspace name is required")
  .max(255, "Workspace name must be less than 255 characters");

/**
 * Team size options
 */
export const TeamSizeSchema = z.enum([
  "solo",
  "2-10",
  "11-50",
  "51-200",
  "200+",
]);

/**
 * User role options
 */
export const UserRoleSchema = z.enum([
  "developer",
  "designer",
  "product_manager",
  "other",
]);

/**
 * Login flow validation
 */
export const LoginEmailSchema = z.object({
  email: EmailSchema,
});

export const LoginOtpSchema = z.object({
  email: EmailSchema,
  otp: OtpSchema,
});

export type LoginEmail = z.infer<typeof LoginEmailSchema>;
export type LoginOtp = z.infer<typeof LoginOtpSchema>;

/**
 * Registration flow validation
 */
export const RegisterEmailSchema = z.object({
  email: EmailSchema,
});

export const RegisterOtpSchema = z.object({
  otp: OtpSchema,
});

export const RegisterProfileSchema = z.object({
  name: NameSchema,
  userRole: UserRoleSchema,
});

export const RegisterOrganizationSchema = z.object({
  companyName: CompanyNameSchema,
  teamSize: TeamSizeSchema,
});

export const RegisterWorkspaceSchema = z.object({
  workspaceName: WorkspaceNameSchema,
});

export const RegisterInviteSchema = z.object({
  invitedEmails: z.array(EmailSchema),
});

export const CompleteRegistrationSchema = z.object({
  email: EmailSchema,
  otp: OtpSchema,
  name: NameSchema,
  companyName: CompanyNameSchema.optional(),
  teamSize: TeamSizeSchema,
  userRole: UserRoleSchema,
  workspaceName: WorkspaceNameSchema.optional(),
  invitedEmails: z.array(EmailSchema).optional(),
});

export type RegisterProfile = z.infer<typeof RegisterProfileSchema>;
export type RegisterOrganization = z.infer<typeof RegisterOrganizationSchema>;
export type RegisterWorkspace = z.infer<typeof RegisterWorkspaceSchema>;
export type RegisterInvite = z.infer<typeof RegisterInviteSchema>;
export type CompleteRegistration = z.infer<typeof CompleteRegistrationSchema>;

/**
 * Invitation acceptance validation
 */
export const AcceptInvitationSchema = z.object({
  email: EmailSchema,
  name: NameSchema.optional(),
});

export type AcceptInvitation = z.infer<typeof AcceptInvitationSchema>;

/**
 * Helper functions for validation
 */

/**
 * Validates email - simple utility
 */
export function isValidEmail(email: string): boolean {
  try {
    EmailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates OTP format
 */
export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Validates email array for invitations
 */
export function validateInvitationEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach((email) => {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { valid, invalid };
}

/**
 * Removes duplicate emails (case-insensitive)
 */
export function deduplicateEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter((email) => {
    const lower = email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
