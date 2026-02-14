import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { SwaggerDocsConfig } from "@/config/config.service";
import { createBasicAuthMiddleware } from "./docs-basic-auth.middleware";

const SWAGGER_UI_ROUTE = "api/docs";
const SWAGGER_JSON_ROUTE = "api/docs-json";
const SWAGGER_UI_PATH = `/${SWAGGER_UI_ROUTE}`;
const SWAGGER_JSON_PATH = `/${SWAGGER_JSON_ROUTE}`;

export function bootstrapSwagger(
  app: unknown,
  config: SwaggerDocsConfig
): void {
  if (!config.enabled) {
    return;
  }

  if (!config.username || !config.password) {
    throw new Error(
      "Swagger docs are enabled but SWAGGER_DOCS_USERNAME or SWAGGER_DOCS_PASSWORD is missing"
    );
  }

  const swaggerApplication = app as Parameters<
    typeof SwaggerModule.createDocument
  >[0];

  const basicAuthMiddleware = createBasicAuthMiddleware({
    username: config.username,
    password: config.password,
  });

  swaggerApplication.use(SWAGGER_UI_PATH, basicAuthMiddleware);
  swaggerApplication.use(SWAGGER_JSON_PATH, basicAuthMiddleware);

  const document = SwaggerModule.createDocument(
    swaggerApplication,
    new DocumentBuilder()
      .setTitle("Locus API")
      .setDescription("Locus API endpoints")
      .setVersion("0.11.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token",
        },
        "bearer"
      )
      .addApiKey(
        {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "API key sent via X-API-Key header",
        },
        "apiKey"
      )
      .addSecurityRequirements("bearer")
      .addSecurityRequirements("apiKey")
      .build()
  );

  SwaggerModule.setup(SWAGGER_UI_ROUTE, swaggerApplication, document, {
    raw: ["json"],
    jsonDocumentUrl: SWAGGER_JSON_ROUTE,
  });
}
