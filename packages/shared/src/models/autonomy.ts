import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export enum RiskLevel {
  LOW = "LOW",
  HIGH = "HIGH",
}

export enum ChangeCategory {
  FIX = "FIX",
  REFACTOR = "REFACTOR",
  STYLE = "STYLE",
  DEPENDENCY = "DEPENDENCY",
  FEATURE = "FEATURE",
  ARCHITECTURE = "ARCHITECTURE",
  DATABASE = "DATABASE",
  AUTH = "AUTH",
  API = "API",
}

// ============================================================================
// Schemas
// ============================================================================

export const AutonomyRuleSchema = z.object({
  category: z.enum(ChangeCategory),
  riskLevel: z.enum(RiskLevel),
  autoExecute: z.boolean(),
});

export type AutonomyRule = z.infer<typeof AutonomyRuleSchema>;

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_AUTONOMY_RULES: AutonomyRule[] = [
  { category: ChangeCategory.FIX, riskLevel: RiskLevel.LOW, autoExecute: true },
  { category: ChangeCategory.REFACTOR, riskLevel: RiskLevel.LOW, autoExecute: true },
  { category: ChangeCategory.STYLE, riskLevel: RiskLevel.LOW, autoExecute: true },
  { category: ChangeCategory.DEPENDENCY, riskLevel: RiskLevel.LOW, autoExecute: true },
  { category: ChangeCategory.FEATURE, riskLevel: RiskLevel.HIGH, autoExecute: false },
  { category: ChangeCategory.ARCHITECTURE, riskLevel: RiskLevel.HIGH, autoExecute: false },
  { category: ChangeCategory.DATABASE, riskLevel: RiskLevel.HIGH, autoExecute: false },
  { category: ChangeCategory.AUTH, riskLevel: RiskLevel.HIGH, autoExecute: false },
  { category: ChangeCategory.API, riskLevel: RiskLevel.HIGH, autoExecute: false },
];
