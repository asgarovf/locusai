import {
  DEFAULT_MANIFEST_VALUES,
  ProjectManifestType,
  REQUIRED_MANIFEST_FIELDS,
} from "@locusai/shared";
import { Test, TestingModule } from "@nestjs/testing";
import { TypedConfigService } from "@/config/config.service";
import { ManifestValidatorService } from "./manifest-validator.service";

describe("ManifestValidatorService", () => {
  let service: ManifestValidatorService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "MANIFEST_COMPLETION_THRESHOLD") {
          return 100; // Default threshold for tests
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManifestValidatorService,
        {
          provide: TypedConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ManifestValidatorService>(ManifestValidatorService);
  });

  describe("isFieldFilled", () => {
    it("should return false for null", () => {
      expect(service.isFieldFilled(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(service.isFieldFilled(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(service.isFieldFilled("")).toBe(false);
    });

    it("should return false for whitespace-only string", () => {
      expect(service.isFieldFilled("   ")).toBe(false);
      expect(service.isFieldFilled("\t\n")).toBe(false);
    });

    it("should return true for non-empty string", () => {
      expect(service.isFieldFilled("hello")).toBe(true);
      expect(service.isFieldFilled("  hello  ")).toBe(true);
    });

    it("should return false for empty array", () => {
      expect(service.isFieldFilled([])).toBe(false);
    });

    it("should return true for non-empty array", () => {
      expect(service.isFieldFilled(["item"])).toBe(true);
      expect(service.isFieldFilled([1, 2, 3])).toBe(true);
    });

    it("should return true for other truthy values", () => {
      expect(service.isFieldFilled("PLANNING")).toBe(true);
      expect(service.isFieldFilled(0)).toBe(true);
      expect(service.isFieldFilled({})).toBe(true);
    });
  });

  describe("calculateCompletion", () => {
    it("should return 0% for null manifest", () => {
      const result = service.calculateCompletion(null);

      expect(result.isManifestComplete).toBe(false);
      expect(result.manifestCompletionPercentage).toBe(0);
      expect(result.filledFields).toEqual([]);
      expect(result.missingFields).toEqual(REQUIRED_MANIFEST_FIELDS);
    });

    it("should return 0% for undefined manifest", () => {
      const result = service.calculateCompletion(undefined);

      expect(result.isManifestComplete).toBe(false);
      expect(result.manifestCompletionPercentage).toBe(0);
      expect(result.filledFields).toEqual([]);
      expect(result.missingFields).toEqual(REQUIRED_MANIFEST_FIELDS);
    });

    it("should return 0% for empty manifest", () => {
      const result = service.calculateCompletion({});

      expect(result.isManifestComplete).toBe(false);
      expect(result.manifestCompletionPercentage).toBe(0);
      expect(result.filledFields).toEqual([]);
      expect(result.missingFields).toEqual(REQUIRED_MANIFEST_FIELDS);
    });

    it("should return 0% for manifest with default values (all empty)", () => {
      const result = service.calculateCompletion(DEFAULT_MANIFEST_VALUES);

      // Default values have empty strings and empty arrays for most fields
      // Only "phase" has a valid default ("PLANNING")
      expect(result.isManifestComplete).toBe(false);
      expect(result.filledFields).toContain("phase");
      expect(result.manifestCompletionPercentage).toBe(
        Math.round((1 / REQUIRED_MANIFEST_FIELDS.length) * 100)
      );
    });

    it("should return 100% for fully completed manifest", () => {
      const completeManifest: Partial<ProjectManifestType> = {
        name: "My Project",
        mission: "To build something great",
        targetUsers: ["developers", "designers"],
        techStack: ["React", "TypeScript", "Node.js"],
        phase: "MVP_BUILD",
        features: ["Authentication", "Dashboard"],
        competitors: ["CompetitorA", "CompetitorB"],
      };

      const result = service.calculateCompletion(completeManifest);

      expect(result.isManifestComplete).toBe(true);
      expect(result.manifestCompletionPercentage).toBe(100);
      expect(result.filledFields).toHaveLength(REQUIRED_MANIFEST_FIELDS.length);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should calculate correct percentage for partially filled manifest", () => {
      const partialManifest: Partial<ProjectManifestType> = {
        name: "My Project",
        mission: "To build something great",
        targetUsers: [],
        techStack: ["React"],
        phase: "PLANNING",
        features: [],
        competitors: [],
      };

      const result = service.calculateCompletion(partialManifest);

      // Filled: name, mission, techStack, phase (4 fields)
      // Empty: targetUsers, features, competitors (3 fields)
      expect(result.isManifestComplete).toBe(false);
      expect(result.filledFields).toContain("name");
      expect(result.filledFields).toContain("mission");
      expect(result.filledFields).toContain("techStack");
      expect(result.filledFields).toContain("phase");
      expect(result.filledFields).not.toContain("targetUsers");
      expect(result.filledFields).not.toContain("features");
      expect(result.filledFields).not.toContain("competitors");

      // 4 out of 7 = 57% (rounded)
      expect(result.manifestCompletionPercentage).toBe(57);
    });

    it("should not count whitespace-only strings as filled", () => {
      const manifestWithWhitespace: Partial<ProjectManifestType> = {
        name: "   ",
        mission: "\t\n",
        targetUsers: ["valid"],
        techStack: [],
        phase: "PLANNING",
        features: [],
        competitors: [],
      };

      const result = service.calculateCompletion(manifestWithWhitespace);

      expect(result.filledFields).not.toContain("name");
      expect(result.filledFields).not.toContain("mission");
      expect(result.filledFields).toContain("targetUsers");
      expect(result.filledFields).toContain("phase");
      expect(result.missingFields).toContain("name");
      expect(result.missingFields).toContain("mission");
    });

    it("should handle manifest with only required fields", () => {
      const manifest: Partial<ProjectManifestType> = {
        name: "Test",
        mission: "Test mission",
        targetUsers: ["user"],
        techStack: ["tech"],
        phase: "SCALING",
        features: ["feature"],
        competitors: ["competitor"],
        // Optional fields not included
      };

      const result = service.calculateCompletion(manifest);

      expect(result.isManifestComplete).toBe(true);
      expect(result.manifestCompletionPercentage).toBe(100);
    });

    it("should ignore optional fields in completion calculation", () => {
      const manifestWithOptionals: Partial<ProjectManifestType> = {
        name: "Test",
        mission: "Mission",
        targetUsers: ["user"],
        techStack: ["tech"],
        phase: "MAINTENANCE",
        features: ["feature"],
        competitors: ["comp"],
        // Optional fields
        brandVoice: "Professional",
        successMetrics: ["metric1"],
        completenessScore: 50,
      };

      const result = service.calculateCompletion(manifestWithOptionals);

      // Should only consider the 7 required fields
      expect(result.isManifestComplete).toBe(true);
      expect(result.manifestCompletionPercentage).toBe(100);
      expect(result.filledFields).toHaveLength(REQUIRED_MANIFEST_FIELDS.length);
    });

    it("should correctly list missing fields", () => {
      const partialManifest: Partial<ProjectManifestType> = {
        name: "Project",
        phase: "PLANNING",
      };

      const result = service.calculateCompletion(partialManifest);

      expect(result.missingFields).toContain("mission");
      expect(result.missingFields).toContain("targetUsers");
      expect(result.missingFields).toContain("techStack");
      expect(result.missingFields).toContain("features");
      expect(result.missingFields).toContain("competitors");
      expect(result.missingFields).not.toContain("name");
      expect(result.missingFields).not.toContain("phase");
    });
  });

  describe("integration with REQUIRED_MANIFEST_FIELDS", () => {
    it("should check exactly 7 required fields", () => {
      expect(REQUIRED_MANIFEST_FIELDS).toHaveLength(7);
      expect(REQUIRED_MANIFEST_FIELDS).toEqual([
        "name",
        "mission",
        "targetUsers",
        "techStack",
        "phase",
        "features",
        "competitors",
      ]);
    });

    it("should handle all field types correctly", () => {
      // Test that all required field types are handled
      const manifest: Partial<ProjectManifestType> = {
        name: "String field", // string
        mission: "Another string", // string
        targetUsers: ["array", "field"], // array
        techStack: ["another", "array"], // array
        phase: "MVP_BUILD", // enum (treated as string)
        features: ["feature"], // array
        competitors: ["comp"], // array
      };

      const result = service.calculateCompletion(manifest);

      expect(result.isManifestComplete).toBe(true);
      expect(result.manifestCompletionPercentage).toBe(100);
    });
  });
});
