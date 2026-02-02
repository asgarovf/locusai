import { ProjectManifest } from "./interfaces";

export const REQUIRED_MANIFEST_FIELDS: (keyof ProjectManifest)[] = [
  "name",
  "mission",
  "targetUsers",
  "techStack",
  "phase",
  "features",
  "competitors",
  "brandVoice",
  "successMetrics",
];

/**
 * Default threshold percentage (0-100) for manifest completion.
 * Features gated by manifest completion will be unlocked when the
 * manifest reaches this percentage of completion.
 */
export const MANIFEST_COMPLETION_THRESHOLD = 70;
