import {
  DEFAULT_MANIFEST_VALUES,
  ManifestCompletionResult,
  ManifestValidationResult,
  PartialProjectManifestSchema,
  ProjectManifestType,
  REQUIRED_MANIFEST_FIELDS,
} from "@locusai/shared";
import { Injectable, Logger } from "@nestjs/common";
import { TypedConfigService } from "@/config/config.service";

@Injectable()
export class ManifestValidatorService {
  private readonly logger = new Logger(ManifestValidatorService.name);

  constructor(private readonly configService: TypedConfigService) {}

  /**
   * Validates a manifest and repairs missing or corrupted fields.
   * Returns a validation result with the repaired manifest.
   */
  validateAndRepair(
    manifest: Partial<ProjectManifestType> | null | undefined,
    workspaceId: string
  ): ManifestValidationResult {
    const result: ManifestValidationResult = {
      isValid: true,
      wasRepaired: false,
      repairedFields: [],
      errors: [],
      manifest: null,
    };

    // Handle null/undefined manifest
    if (!manifest) {
      result.manifest = { ...DEFAULT_MANIFEST_VALUES };
      result.wasRepaired = true;
      result.repairedFields = Object.keys(DEFAULT_MANIFEST_VALUES);
      this.logCorruption(workspaceId, "MISSING_MANIFEST", {
        message: "Manifest was null or undefined, initialized with defaults",
      });
      return result;
    }

    // Validate against schema
    const parseResult = PartialProjectManifestSchema.safeParse(manifest);

    if (!parseResult.success) {
      result.isValid = false;
      result.errors = parseResult.error.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );

      this.logCorruption(workspaceId, "SCHEMA_VALIDATION_FAILED", {
        errors: result.errors,
        originalManifest: manifest,
      });
    }

    // Create repaired manifest starting from the original
    const repairedManifest: Partial<ProjectManifestType> = { ...manifest };

    // Check and repair missing required fields
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      const value = manifest[field];
      if (value === undefined || value === null) {
        const defaultValue = DEFAULT_MANIFEST_VALUES[field];
        repairedManifest[field] = defaultValue as never;
        result.repairedFields.push(field);
        result.wasRepaired = true;
      } else if (Array.isArray(DEFAULT_MANIFEST_VALUES[field])) {
        // Ensure array fields are actually arrays
        if (!Array.isArray(value)) {
          const defaultValue = DEFAULT_MANIFEST_VALUES[field];
          repairedManifest[field] = defaultValue as never;
          result.repairedFields.push(field);
          result.wasRepaired = true;
          result.errors.push(
            `Field '${field}' was not an array, reset to default`
          );
        }
      }
    }

    // Validate and repair specific fields
    this.repairSpecificFields(repairedManifest, result);

    // Log repairs if any were made
    if (result.wasRepaired) {
      this.logCorruption(workspaceId, "MANIFEST_REPAIRED", {
        repairedFields: result.repairedFields,
        originalManifest: manifest,
        repairedManifest,
      });
    }

    result.manifest = repairedManifest;
    return result;
  }

  /**
   * Validates manifest without repair - returns validation errors only.
   */
  validate(manifest: Partial<ProjectManifestType> | null | undefined): {
    isValid: boolean;
    errors: string[];
  } {
    if (!manifest) {
      return {
        isValid: false,
        errors: ["Manifest is null or undefined"],
      };
    }

    const parseResult = PartialProjectManifestSchema.safeParse(manifest);

    if (!parseResult.success) {
      return {
        isValid: false,
        errors: parseResult.error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        ),
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Repairs specific fields that have known constraints.
   */
  private repairSpecificFields(
    manifest: Partial<ProjectManifestType>,
    result: ManifestValidationResult
  ): void {
    // Ensure completenessScore is within valid range
    if (manifest.completenessScore !== undefined) {
      if (
        typeof manifest.completenessScore !== "number" ||
        Number.isNaN(manifest.completenessScore)
      ) {
        manifest.completenessScore = 0;
        result.repairedFields.push("completenessScore");
        result.wasRepaired = true;
        result.errors.push("completenessScore was invalid, reset to 0");
      } else if (manifest.completenessScore < 0) {
        manifest.completenessScore = 0;
        result.repairedFields.push("completenessScore");
        result.wasRepaired = true;
      } else if (manifest.completenessScore > 100) {
        manifest.completenessScore = 100;
        result.repairedFields.push("completenessScore");
        result.wasRepaired = true;
      }
    }

    // Ensure phase is a valid value
    if (manifest.phase !== undefined) {
      const validPhases = ["PLANNING", "MVP_BUILD", "SCALING", "MAINTENANCE"];
      if (!validPhases.includes(manifest.phase)) {
        manifest.phase = "PLANNING";
        result.repairedFields.push("phase");
        result.wasRepaired = true;
        result.errors.push(`Invalid phase value, reset to 'PLANNING'`);
      }
    }

    // Repair repositoryState if present but malformed
    if (manifest.repositoryState !== undefined) {
      if (
        typeof manifest.repositoryState !== "object" ||
        manifest.repositoryState === null
      ) {
        // Remove invalid repositoryState rather than setting empty
        delete manifest.repositoryState;
        result.repairedFields.push("repositoryState");
        result.wasRepaired = true;
      } else {
        const repoState = manifest.repositoryState;
        if (typeof repoState.summary !== "string") {
          repoState.summary = "";
          result.repairedFields.push("repositoryState.summary");
          result.wasRepaired = true;
        }
        if (typeof repoState.fileStructure !== "string") {
          repoState.fileStructure = "";
          result.repairedFields.push("repositoryState.fileStructure");
          result.wasRepaired = true;
        }
        if (
          typeof repoState.dependencies !== "object" ||
          repoState.dependencies === null
        ) {
          repoState.dependencies = {};
          result.repairedFields.push("repositoryState.dependencies");
          result.wasRepaired = true;
        }
        if (!Array.isArray(repoState.frameworks)) {
          repoState.frameworks = [];
          result.repairedFields.push("repositoryState.frameworks");
          result.wasRepaired = true;
        }
        if (!Array.isArray(repoState.configFiles)) {
          repoState.configFiles = [];
          result.repairedFields.push("repositoryState.configFiles");
          result.wasRepaired = true;
        }
        if (typeof repoState.lastAnalysis !== "string") {
          repoState.lastAnalysis = new Date().toISOString();
          result.repairedFields.push("repositoryState.lastAnalysis");
          result.wasRepaired = true;
        }
      }
    }
  }

  /**
   * Logs manifest corruption events for debugging.
   */
  private logCorruption(
    workspaceId: string,
    eventType: string,
    details: Record<string, unknown>
  ): void {
    this.logger.warn(
      JSON.stringify({
        event: "MANIFEST_CORRUPTION",
        eventType,
        workspaceId,
        timestamp: new Date().toISOString(),
        ...details,
      })
    );
  }

  /**
   * Checks if a field value is considered "filled" (non-empty, non-trivial).
   * - Strings: non-empty and non-whitespace only
   * - Arrays: has at least one element
   * - null/undefined: not filled
   */
  isFieldFilled(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // For other types (like 'phase' which is always a valid enum), consider filled
    return true;
  }

  /**
   * Calculates manifest completion based on REQUIRED_MANIFEST_FIELDS.
   * Returns completion percentage (0-100) and whether manifest is complete.
   */
  calculateCompletion(
    manifest: Partial<ProjectManifestType> | null | undefined
  ): ManifestCompletionResult {
    if (!manifest) {
      return {
        isManifestComplete: false,
        manifestCompletionPercentage: 0,
        filledFields: [],
        missingFields: [...REQUIRED_MANIFEST_FIELDS],
      };
    }

    const filledFields: (keyof ProjectManifestType)[] = [];
    const missingFields: (keyof ProjectManifestType)[] = [];

    for (const field of REQUIRED_MANIFEST_FIELDS) {
      const value = manifest[field];
      if (this.isFieldFilled(value)) {
        filledFields.push(field);
      } else {
        missingFields.push(field);
      }
    }

    const totalFields = REQUIRED_MANIFEST_FIELDS.length;
    const completionPercentage = Math.round(
      (filledFields.length / totalFields) * 100
    );

    const threshold = this.configService.get("MANIFEST_COMPLETION_THRESHOLD");

    return {
      isManifestComplete: completionPercentage >= threshold,
      manifestCompletionPercentage: completionPercentage,
      filledFields,
      missingFields,
    };
  }
}
