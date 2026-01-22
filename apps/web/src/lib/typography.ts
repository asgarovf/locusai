/**
 * Typography System
 * 
 * Centralized typography scales and variants for brand-consistent design.
 * All text components should consume from this system.
 */

export const typographyConfig = {
  // Heading scales
  h1: {
    className: "text-4xl font-black tracking-tight",
    description: "Page titles, major sections",
  },
  h2: {
    className: "text-3xl font-bold tracking-tight",
    description: "Section headers",
  },
  h3: {
    className: "text-2xl font-bold tracking-tight",
    description: "Subsection headers",
  },
  h4: {
    className: "text-xl font-semibold tracking-tight",
    description: "Component titles",
  },
  h5: {
    className: "text-lg font-semibold tracking-tight",
    description: "Card titles, labels",
  },
  h6: {
    className: "text-base font-semibold tracking-tight",
    description: "Minor titles",
  },

  // Body text
  bodyLg: {
    className: "text-base font-normal leading-relaxed",
    description: "Large body text",
  },
  body: {
    className: "text-sm font-normal leading-relaxed",
    description: "Standard body text",
  },
  bodySm: {
    className: "text-xs font-normal leading-relaxed",
    description: "Small body text",
  },

  // Labels and captions
  label: {
    className: "text-[10px] font-bold uppercase tracking-widest",
    description: "Form labels, section labels",
  },
  caption: {
    className: "text-xs font-medium text-muted-foreground",
    description: "Captions, helper text",
  },
  captionSm: {
    className: "text-[10px] font-medium text-muted-foreground",
    description: "Small captions",
  },

  // Code and monospace
  code: {
    className: "text-sm font-mono bg-secondary/30 px-2 py-1 rounded",
    description: "Inline code",
  },
  codeBlock: {
    className: "text-sm font-mono leading-relaxed",
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
