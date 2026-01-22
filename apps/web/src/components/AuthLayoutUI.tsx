/**
 * Auth Layout UI Component
 *
 * Provides centered card layout for authentication pages.
 * Includes branding, logo, and centered content area.
 * Used by login, register, and other auth flows.
 *
 * Features:
 * - Centered layout with max-width constraint
 * - Branding section with logo
 * - Responsive padding and spacing
 * - Consistent styling across auth pages
 *
 * @example
 * <AuthLayoutUI>
 *   <LoginForm />
 * </AuthLayoutUI>
 */

import Image from "next/image";
import { SecondaryText } from "./typography";

interface AuthLayoutUIProps {
  /** Content to display in the centered card */
  children: React.ReactNode;
}

export function AuthLayoutUI({ children }: AuthLayoutUIProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px]">
        {/* Branding Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-8 w-[98px] mb-2">
            <Image
              src="/logo.png"
              alt="Locus AI Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <SecondaryText size="xs">Intelligent Task Management</SecondaryText>
        </div>

        {/* Content Card */}
        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
