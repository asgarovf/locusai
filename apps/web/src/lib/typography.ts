/**
 * Typography System
 *
 * Centralized typography scales and variants for brand-consistent design.
 * All text components should consume from this system.
 *
 * Readability Standards:
 * - Primary text: text-foreground (100%)
 * - Secondary text: text-foreground/60-70% (better contrast than text-muted-foreground)
 * - Tertiary text: text-foreground/40-50%
 * - Labels: text-foreground/60% with uppercase
 * - Disabled: text-muted-foreground
 */

export const typographyConfig = {
  // Heading scales
  h1: {
    className: "text-4xl font-black tracking-tight text-foreground",
    description: "Page titles, major sections",
  },
  h2: {
    className: "text-3xl font-bold tracking-tight text-foreground",
    description: "Section headers",
  },
  h3: {
    className: "text-2xl font-bold tracking-tight text-foreground",
    description: "Subsection headers",
  },
  h4: {
    className: "text-xl font-semibold tracking-tight text-foreground",
    description: "Component titles",
  },
  h5: {
    className: "text-lg font-semibold tracking-tight text-foreground",
    description: "Card titles, labels",
  },
  h6: {
    className: "text-base font-semibold tracking-tight text-foreground",
    description: "Minor titles",
  },

  // Body text
  bodyLg: {
    className: "text-base font-normal leading-relaxed text-foreground",
    description: "Large body text",
  },
  body: {
    className: "text-sm font-normal leading-relaxed text-foreground",
    description: "Standard body text",
  },
  bodySm: {
    className: "text-xs font-normal leading-relaxed text-foreground/70",
    description: "Small body text with better secondary contrast",
  },

  // Labels and captions - standardized for readability
  label: {
    className:
      "text-[10px] font-bold uppercase tracking-widest text-foreground/60",
    description: "Form labels, section labels - readable secondary text",
  },
  caption: {
    className: "text-xs font-medium text-foreground/65",
    description:
      "Captions, helper text - improved contrast over muted-foreground",
  },
  captionSm: {
    className: "text-[10px] font-medium text-foreground/60",
    description: "Small captions - readable secondary text",
  },

  // Code and monospace
  code: {
    className:
      "text-sm font-mono bg-secondary/30 px-2 py-1 rounded text-foreground",
    description: "Inline code",
  },
  codeBlock: {
    className: "text-sm font-mono leading-relaxed text-foreground",
    description: "Code blocks",
  },
} as const;

// Export for use in components
export type TypographyVariant = keyof typeof typographyConfig;

/**
 * Get typography class name by variant
 * @example
 * const titleClass = getTypographyClass('h1');
 */
export function getTypographyClass(variant: TypographyVariant): string {
  return typographyConfig[variant].className;
}

/**
 * Typography component props helper
 */
export interface TypographyProps {
  variant: TypographyVariant;
  className?: string;
  children: React.ReactNode;
}
