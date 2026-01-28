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
