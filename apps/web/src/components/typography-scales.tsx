/**
 * Typography Components
 *
 * Reusable components that apply consistent typography styles and scales.
 * All typography variants are defined in `@/lib/typography` for centralized consistency.
 *
 * Readability Standards:
 * - Primary text: text-foreground (100% opacity)
 * - Secondary text: text-foreground/60-70% (improved from text-muted-foreground)
 * - Labels: text-foreground/60% with uppercase
 * - Disabled states: text-muted-foreground
 *
 * Features:
 * - Semantic HTML heading tags (h1-h6)
 * - Consistent spacing and tracking
 * - Responsive text sizes
 * - Built-in accessibility
 * - Easy className overrides with cn()
 *
 * @example
 * <Heading variant="h1">Page Title</Heading>
 * <Body variant="body">Regular text</Body>
 * <Label required>Field Label</Label>
 */

"use client";

import { getTypographyClass } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level and size variant */
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

/**
 * Heading Component
 *
 * Renders semantic heading tags with consistent typography.
 * Maps variant prop to appropriate heading level.
 *
 * @component
 */
export function Heading({
  variant = "h2",
  className,
  children,
  ...props
}: HeadingProps) {
  const headingLevel = variant as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  switch (headingLevel) {
    case "h1":
      return (
        <h1 className={cn(getTypographyClass("h1"), className)} {...props}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 className={cn(getTypographyClass("h2"), className)} {...props}>
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 className={cn(getTypographyClass("h3"), className)} {...props}>
          {children}
        </h3>
      );
    case "h4":
      return (
        <h4 className={cn(getTypographyClass("h4"), className)} {...props}>
          {children}
        </h4>
      );
    case "h5":
      return (
        <h5 className={cn(getTypographyClass("h5"), className)} {...props}>
          {children}
        </h5>
      );
    case "h6":
      return (
        <h6 className={cn(getTypographyClass("h6"), className)} {...props}>
          {children}
        </h6>
      );
  }
}

interface BodyProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Body text size variant */
  variant?: "bodyLg" | "body" | "bodySm";
}

/**
 * Body Component
 *
 * Renders paragraph text with consistent typography.
 * Supports multiple size variants for flexible content layout.
 *
 * @component
 */
export function Body({
  variant = "body",
  className,
  children,
  ...props
}: BodyProps) {
  return (
    <p className={cn(getTypographyClass(variant), className)} {...props}>
      {children}
    </p>
  );
}

interface LabelProps extends React.HTMLAttributes<HTMLLabelElement> {
  /** Whether field is required (shows red asterisk) */
  required?: boolean;
  /** Label size variant */
  variant?: "label" | "caption" | "captionSm";
}

/**
 * Label Component
 *
 * Renders form label with optional required indicator.
 * Supports multiple size variants for form layouts.
 * Includes accessibility features for form associations.
 *
 * @component
 */
export function Label({
  variant = "label",
  required,
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <label className={cn(getTypographyClass(variant), className)} {...props}>
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

interface CaptionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Caption size variant */
  variant?: "caption" | "captionSm";
}

/**
 * Caption Component
 *
 * Renders smaller supplementary text for captions and helper text.
 * Provides improved readability with text-foreground/60-65%.
 *
 * @component
 */
export function Caption({
  variant = "caption",
  className,
  children,
  ...props
}: CaptionProps) {
  return (
    <div className={cn(getTypographyClass(variant), className)} {...props}>
      {children}
    </div>
  );
}

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  /** Code variant (inline or block) */
  variant?: "code" | "codeBlock";
  /** Whether to render as code block (pre tag) */
  block?: boolean;
}

/**
 * Code Component
 *
 * Renders inline code or code blocks with monospace font.
 * Supports both <code> and <pre> tags for different contexts.
 *
 * @component
 */
export function Code({
  variant,
  block,
  className,
  children,
  ...props
}: CodeProps) {
  const v = block ? "codeBlock" : variant || "code";

  if (block) {
    return (
      <pre
        className={cn(getTypographyClass(v), className)}
        {...(props as React.HTMLAttributes<HTMLPreElement>)}
      >
        {children}
      </pre>
    );
  }

  return (
    <code
      className={cn(getTypographyClass(v), className)}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </code>
  );
}
