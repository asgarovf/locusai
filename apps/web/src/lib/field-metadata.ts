import type { ProjectManifestType } from "@locusai/shared";
import {
  Code2,
  Flag,
  Lightbulb,
  Rocket,
  Target,
  Trophy,
  Users,
} from "lucide-react";

/**
 * Field Metadata for Project Manifest
 *
 * Shared metadata for all interview/manifest fields.
 * Used by InterviewGate, InterviewProgress, and FieldChecklist components.
 */

export interface FieldMetadata {
  key: keyof ProjectManifestType;
  label: string;
  description: string;
  icon: React.ElementType;
}

export const FIELD_METADATA: FieldMetadata[] = [
  {
    key: "name",
    label: "Project Name",
    description: "The name of your project",
    icon: Flag,
  },
  {
    key: "mission",
    label: "Mission",
    description: "The core purpose and value proposition",
    icon: Target,
  },
  {
    key: "targetUsers",
    label: "Target Users",
    description: "Who will use your product",
    icon: Users,
  },
  {
    key: "techStack",
    label: "Tech Stack",
    description: "Technologies and frameworks used",
    icon: Code2,
  },
  {
    key: "phase",
    label: "Project Phase",
    description: "Current development stage",
    icon: Rocket,
  },
  {
    key: "features",
    label: "Features",
    description: "Key features and capabilities",
    icon: Lightbulb,
  },
  {
    key: "competitors",
    label: "Competitors",
    description: "Alternative solutions in the market",
    icon: Trophy,
  },
];

/**
 * Get metadata for a specific field by key
 */
export function getFieldMetadata(fieldKey: string): FieldMetadata | undefined {
  return FIELD_METADATA.find((f) => f.key === fieldKey);
}

/**
 * Total number of manifest fields
 */
export const TOTAL_FIELDS = FIELD_METADATA.length;
