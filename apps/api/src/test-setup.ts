/**
 * Shared test setup for auth module tests.
 * This file mocks TypeORM entities to avoid circular dependency issues during testing.
 *
 * Import this file at the TOP of your test file, BEFORE any other imports:
 * import "./setup";
 */

// Mock all entities to avoid TypeORM decorator issues
jest.mock("@/entities", () => ({
  User: class {},
  Organization: class {},
  Workspace: class {},
  Membership: class {},
  ApiKey: class {},
}));

jest.mock("@/entities/api-key.entity", () => ({
  ApiKey: class {},
}));

jest.mock("@/entities/user.entity", () => ({
  User: class {},
}));

jest.mock("@/entities/organization.entity", () => ({
  Organization: class {},
}));

jest.mock("@/entities/workspace.entity", () => ({
  Workspace: class {},
}));

jest.mock("@/entities/membership.entity", () => ({
  Membership: class {},
}));

jest.mock("@/entities/otp-verification.entity", () => ({
  OtpVerification: class {},
}));

jest.mock("@/entities/aws-credential.entity", () => ({
  AwsCredential: class {},
}));

jest.mock("@/entities/aws-instance.entity", () => ({
  AwsInstance: class {},
}));

jest.mock("@/entities/job-run.entity", () => ({
  JobRun: class {},
}));

jest.mock("@/entities/suggestion.entity", () => ({
  Suggestion: class {},
}));
