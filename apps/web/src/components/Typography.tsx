/**
 * Typography Components
 *
 * Reusable components that apply consistent typography styles.
 */

"use client";

import { getTypographyClass } from "@/lib/typography";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

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
  variant?: "bodyLg" | "body" | "bodySm";
}

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
  required?: boolean;
  variant?: "label" | "caption" | "captionSm";
}

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
  variant?: "caption" | "captionSm";
}

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
  variant?: "code" | "codeBlock";
  block?: boolean;
}

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
