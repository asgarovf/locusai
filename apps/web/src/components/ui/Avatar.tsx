"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Avatar component props
 *
 * @property name - User name for initials fallback and alt text
 * @property src - Optional image URL (if not provided, shows initials)
 * @property size - Avatar size (default: "md")
 */
interface AvatarProps {
  /** Image URL for avatar photo */
  src?: string | null;
  /** User name (used for initials and alt text) */
  name: string;
  /** Avatar size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

const imageSizes = {
  sm: 24,
  md: 32,
  lg: 40,
};

/**
 * Extract initials from user name
 * @example getInitials("John Doe") // "JD"
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get consistent color from user name using hash
 * Ensures same name always gets same color
 */
function getColorFromName(name: string): string {
  const colors = [
    "bg-rose-500",
    "bg-pink-500",
    "bg-fuchsia-500",
    "bg-purple-500",
    "bg-violet-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-sky-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-emerald-500",
    "bg-green-500",
    "bg-lime-500",
    "bg-yellow-500",
    "bg-amber-500",
    "bg-orange-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Avatar component
 *
 * Displays user avatar with image or initials fallback.
 * Automatically assigns consistent colors based on name hash.
 *
 * @example
 * // With image
 * <Avatar src="/avatar.jpg" name="John Doe" />
 *
 * @example
 * // Without image (shows initials)
 * <Avatar name="Jane Smith" size="lg" />
 */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={imageSizes[size]}
        height={imageSizes[size]}
        className={cn(
          "rounded-full object-cover ring-2 ring-border/50",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white ring-2 ring-border/50",
        sizeClasses[size],
        getColorFromName(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
