import { z } from "zod";

// ============================================================================
// Project Phase
// ============================================================================

export const ProjectPhaseSchema = z.enum([
  "PLANNING",
  "MVP_BUILD",
  "SCALING",
  "MAINTENANCE",
]);

export type ProjectPhase = z.infer<typeof ProjectPhaseSchema>;

// ============================================================================
// Sprint & Milestone Schemas
// ============================================================================

export const SprintStatusSchema = z.enum(["PLANNED", "ACTIVE", "COMPLETED"]);

export const ProjectSprintSchema = z.object({
  id: z.string(),
  goal: z.string(),
  tasks: z.array(z.string()),
  status: SprintStatusSchema,
});

export type ProjectSprint = z.infer<typeof ProjectSprintSchema>;

export const MilestoneStatusSchema = z.enum(["PENDING", "COMPLETED"]);

export const ProjectMilestoneSchema = z.object({
  title: z.string(),
  date: z.string().optional(),
  status: MilestoneStatusSchema,
});

export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;

export const ProjectTimelineSchema = z.object({
  sprints: z.array(ProjectSprintSchema),
  milestones: z.array(ProjectMilestoneSchema),
});

export type ProjectTimeline = z.infer<typeof ProjectTimelineSchema>;

// ============================================================================
// Repository Context Schema
// ============================================================================

export const RepositoryContextSchema = z.object({
  summary: z.string(),
  fileStructure: z.string(),
  dependencies: z.record(z.string(), z.string()),
  frameworks: z.array(z.string()),
  configFiles: z.array(z.string()),
  lastAnalysis: z.string(),
});

export type RepositoryContext = z.infer<typeof RepositoryContextSchema>;

// ============================================================================
// Project Manifest Schema
// ============================================================================

export const ProjectManifestSchema = z.object({
  name: z.string(),
  mission: z.string(),
  targetUsers: z.array(z.string()),
  techStack: z.array(z.string()),
  phase: ProjectPhaseSchema,
  features: z.array(z.string()),
  competitors: z.array(z.string()),
  brandVoice: z.string().optional(),
  successMetrics: z.array(z.string()).optional(),
  completenessScore: z.number().min(0).max(100),
  timeline: ProjectTimelineSchema.optional(),
  repositoryState: RepositoryContextSchema.optional(),
});

export type ProjectManifestType = z.infer<typeof ProjectManifestSchema>;

// ============================================================================
// Partial Manifest Schema (for validation of existing data)
// ============================================================================

export const PartialProjectManifestSchema = ProjectManifestSchema.partial();

export type PartialProjectManifest = z.infer<
  typeof PartialProjectManifestSchema
>;

// ============================================================================
// Default Values for Manifest Fields
// ============================================================================

export const DEFAULT_MANIFEST_VALUES: ProjectManifestType = {
  name: "",
  mission: "",
  targetUsers: [],
  techStack: [],
  phase: "PLANNING",
  features: [],
  competitors: [],
  brandVoice: "",
  successMetrics: [],
  completenessScore: 0,
};

// ============================================================================
// Required Fields for Manifest Validation
// ============================================================================

export const REQUIRED_MANIFEST_FIELDS: (keyof ProjectManifestType)[] = [
  "name",
  "mission",
  "targetUsers",
  "techStack",
  "phase",
  "features",
  "competitors",
];

// ============================================================================
// Manifest Validation Result
// ============================================================================

export interface ManifestValidationResult {
  isValid: boolean;
  wasRepaired: boolean;
  repairedFields: string[];
  errors: string[];
  manifest: Partial<ProjectManifestType> | null;
}

// ============================================================================
// Manifest Completion Result
// ============================================================================

export interface ManifestCompletionResult {
  isManifestComplete: boolean;
  manifestCompletionPercentage: number;
  filledFields: (keyof ProjectManifestType)[];
  missingFields: (keyof ProjectManifestType)[];
}
