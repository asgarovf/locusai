import configuration from "@/config/configuration";

describe("Swagger env validation", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot };
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgres://localhost:5432/db";
    process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";
    process.env.SWAGGER_DOCS_ENABLED = "true";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("fails with explicit error when swagger docs username is missing", () => {
    delete process.env.SWAGGER_DOCS_USERNAME;
    process.env.SWAGGER_DOCS_PASSWORD = "docs-pass";

    expect(() => configuration()).toThrow(
      "SWAGGER_DOCS_USERNAME is required when SWAGGER_DOCS_ENABLED=true"
    );
  });

  it("fails with explicit error when swagger docs password is empty", () => {
    process.env.SWAGGER_DOCS_USERNAME = "docs-user";
    process.env.SWAGGER_DOCS_PASSWORD = "   ";

    expect(() => configuration()).toThrow(
      "SWAGGER_DOCS_PASSWORD is required when SWAGGER_DOCS_ENABLED=true"
    );
  });
});
