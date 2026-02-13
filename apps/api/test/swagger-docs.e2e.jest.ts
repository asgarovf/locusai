import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { HealthController } from "@/health/health.controller";
import {
  SWAGGER_JSON_PATH,
  SWAGGER_UI_PATH,
  setupSwaggerDocs,
} from "@/swagger/swagger-docs";

const DOCS_USERNAME = "swagger-user";
const DOCS_PASSWORD = "swagger-pass";

async function createApp(swaggerEnabled: boolean): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: DataSource,
        useValue: {
          query: jest.fn().mockResolvedValue([{ ok: 1 }]),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");

  setupSwaggerDocs(app, {
    enabled: swaggerEnabled,
    username: DOCS_USERNAME,
    password: DOCS_PASSWORD,
  });

  await app.init();
  return app;
}

describe("Swagger docs runtime", () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("does not expose docs endpoints when disabled", async () => {
    app = await createApp(false);

    await request(app.getHttpServer()).get(SWAGGER_UI_PATH).expect(404);
    await request(app.getHttpServer()).get(SWAGGER_JSON_PATH).expect(404);
  });

  it("returns 401 for docs UI and raw spec without credentials when enabled", async () => {
    app = await createApp(true);

    await request(app.getHttpServer()).get(SWAGGER_UI_PATH).expect(401);
    await request(app.getHttpServer()).get(SWAGGER_JSON_PATH).expect(401);
  });

  it("returns 200 for docs UI and raw spec with valid credentials when enabled", async () => {
    app = await createApp(true);

    const uiResponse = await request(app.getHttpServer())
      .get(SWAGGER_UI_PATH)
      .auth(DOCS_USERNAME, DOCS_PASSWORD)
      .expect(200);
    expect(uiResponse.text).toContain("Swagger UI");

    const specResponse = await request(app.getHttpServer())
      .get(SWAGGER_JSON_PATH)
      .auth(DOCS_USERNAME, DOCS_PASSWORD)
      .expect(200);
    expect(specResponse.body.openapi).toBeDefined();
  });

  it("generates OpenAPI smoke metadata for key route and schema", async () => {
    app = await createApp(true);

    const specResponse = await request(app.getHttpServer())
      .get(SWAGGER_JSON_PATH)
      .auth(DOCS_USERNAME, DOCS_PASSWORD)
      .expect(200);

    const spec = specResponse.body;
    const healthPath = Object.entries(spec.paths || {}).find(([path]) =>
      /\/health$/.test(path)
    );
    expect(healthPath).toBeDefined();

    const operations = Object.values(
      (healthPath?.[1] as Record<string, { tags?: string[] }>) || {}
    );
    expect(
      operations.some((operation) => operation.tags?.includes("Health"))
    ).toBe(true);
    expect(spec.components?.schemas?.HealthCheckResponseDto).toBeDefined();
  });
});
