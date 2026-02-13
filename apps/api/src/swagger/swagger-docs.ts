import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import basicAuth from "express-basic-auth";

export const SWAGGER_UI_PATH = "/api/docs";
export const SWAGGER_JSON_PATH = "/api/docs-json";

type SwaggerDocsConfig = {
  enabled: boolean;
  username: string;
  password: string;
};

export function setupSwaggerDocs(
  app: INestApplication,
  config: SwaggerDocsConfig
) {
  if (!config.enabled) {
    return null;
  }

  const expressApp = app.getHttpAdapter().getInstance();
  const docsAuthMiddleware = basicAuth({
    users: {
      [config.username]: config.password,
    },
    challenge: true,
    unauthorizedResponse: () => "Unauthorized",
  });

  expressApp.use(SWAGGER_UI_PATH, docsAuthMiddleware);
  expressApp.use(SWAGGER_JSON_PATH, docsAuthMiddleware);

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Locus API")
      .setDescription("Locus backend API documentation")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build()
  );

  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
  });

  return document;
}
