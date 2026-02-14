import "reflect-metadata";
import "../../../test-setup";
import { Controller, Get, INestApplication } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Test, TestingModule } from "@nestjs/testing";
import { SwaggerDocsConfig } from "@/config/config.service";
import { bootstrapSwagger } from "../swagger.bootstrap";

const DOCS_USERNAME = "docs-user";
const DOCS_PASSWORD = "docs-password";
const DOCS_AUTH_CHALLENGE = 'Basic realm="API Docs"';

@ApiTags("swagger-test")
@Controller("swagger-test")
class SwaggerTestController {
  @Get()
  getHealth(): { ok: boolean } {
    return { ok: true };
  }
}

async function createTestApp(
  config: SwaggerDocsConfig
): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SwaggerTestController],
  }).compile();

  const app = module.createNestApplication();
  bootstrapSwagger(app, config);
  await app.init();

  return app;
}

function createBasicAuthHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

interface DispatchResponse {
  body: unknown;
  headers: Record<string, string>;
  status: number;
}

function createMockResponse(): {
  body: unknown;
  end: (value?: unknown) => void;
  finished: boolean;
  headers: Record<string, string>;
  json: (value: unknown) => void;
  send: (value: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => { send: (value: unknown) => void };
  statusCode: number;
  type: (contentType: string) => void;
} {
  const response = {
    body: undefined as unknown,
    end(value?: unknown): void {
      if (value !== undefined) {
        this.body = value;
      }

      this.finished = true;
    },
    finished: false,
    headers: {} as Record<string, string>,
    json(value: unknown): void {
      this.body = value;
      this.finished = true;
    },
    send(value: unknown): void {
      this.body = value;
      this.finished = true;
    },
    setHeader(name: string, value: string): void {
      this.headers[name.toLowerCase()] = value;
    },
    statusCode: 200,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return {
        send: (value: unknown) => {
          this.body = value;
          this.finished = true;
        },
      };
    },
    type(contentType: string): void {
      this.headers["content-type"] = contentType;
    },
  };

  return response;
}

async function dispatchRequest(
  app: INestApplication,
  path: string,
  headers: Record<string, string> = {}
): Promise<DispatchResponse> {
  const expressApp = app.getHttpAdapter().getInstance() as {
    router: {
      stack: Array<{
        handle: (
          request: {
            headers: Record<string, string>;
            method: string;
            originalUrl: string;
            path: string;
            url: string;
          },
          response: {
            body: unknown;
            end: (value?: unknown) => void;
            finished: boolean;
            json: (value: unknown) => void;
            send: (value: unknown) => void;
            setHeader: (name: string, value: string) => void;
            status: (statusCode: number) => { send: (value: unknown) => void };
            statusCode: number;
            type: (contentType: string) => void;
          },
          next: (error?: unknown) => void
        ) => unknown;
        matchers?: Array<(input: string) => unknown>;
        route?: {
          methods: Record<string, boolean>;
        };
      }>;
    };
  };

  const request = {
    headers,
    method: "GET",
    originalUrl: path,
    path,
    url: path,
  };

  const response = createMockResponse();
  let matched = false;

  for (const layer of expressApp.router.stack) {
    if (response.finished) {
      break;
    }

    const isPathMatch = layer.matchers?.some((matcher) => matcher(path));
    if (!isPathMatch) {
      continue;
    }

    if (layer.route && !layer.route.methods.get) {
      continue;
    }

    matched = true;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const next = (error?: unknown): void => {
        if (settled) {
          return;
        }

        settled = true;
        if (error) {
          reject(error);
          return;
        }

        resolve();
      };

      try {
        const result = layer.handle(request, response, next);
        if (result && typeof (result as Promise<unknown>).then === "function") {
          (result as Promise<unknown>)
            .then(() => {
              if (settled) {
                return;
              }

              settled = true;
              resolve();
            })
            .catch((error: unknown) => {
              if (settled) {
                return;
              }

              settled = true;
              reject(error);
            });
          return;
        }

        if (!settled) {
          settled = true;
          resolve();
        }
      } catch (error) {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      }
    });
  }

  if (!matched && !response.finished) {
    response.statusCode = 404;
  }

  return {
    body: response.body,
    headers: response.headers,
    status: response.statusCode,
  };
}

describe("bootstrapSwagger", () => {
  const enabledConfig: SwaggerDocsConfig = {
    enabled: true,
    username: DOCS_USERNAME,
    password: DOCS_PASSWORD,
  };

  const docsRoutes = [{ path: "/api/docs" }, { path: "/api/docs-json" }];

  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("when docs are enabled", () => {
    it.each(
      docsRoutes
    )("should return 401 + challenge when credentials are missing for $path", async ({
      path,
    }) => {
      app = await createTestApp(enabledConfig);

      const response = await dispatchRequest(app, path);

      expect(response.status).toBe(401);
      expect(response.headers["www-authenticate"]).toBe(DOCS_AUTH_CHALLENGE);
    });

    it.each(
      docsRoutes
    )("should return 401 + challenge when credentials are invalid for $path", async ({
      path,
    }) => {
      app = await createTestApp(enabledConfig);

      const invalidAuth = createBasicAuthHeader(
        DOCS_USERNAME,
        "wrong-password"
      );
      const response = await dispatchRequest(app, path, {
        authorization: invalidAuth,
      });

      expect(response.status).toBe(401);
      expect(response.headers["www-authenticate"]).toBe(DOCS_AUTH_CHALLENGE);
    });

    it.each(
      docsRoutes
    )("should return 200 when credentials are valid for $path", async ({
      path,
    }) => {
      app = await createTestApp(enabledConfig);

      const validAuth = createBasicAuthHeader(DOCS_USERNAME, DOCS_PASSWORD);
      const response = await dispatchRequest(app, path, {
        authorization: validAuth,
      });

      expect(response.status).toBe(200);
    });
  });

  describe("when docs are disabled", () => {
    it.each([
      "/api/docs",
      "/api/docs-json",
    ])("should return 404 for %s", async (path) => {
      app = await createTestApp({ enabled: false });

      const response = await dispatchRequest(app, path);

      expect(response.status).toBe(404);
    });
  });

  it("should generate and serve an OpenAPI document without runtime errors", async () => {
    app = await createTestApp(enabledConfig);

    const validAuth = createBasicAuthHeader(DOCS_USERNAME, DOCS_PASSWORD);
    const response = await dispatchRequest(app, "/api/docs-json", {
      authorization: validAuth,
    });
    const openApiDocument = JSON.parse(response.body as string) as {
      info: {
        title: string;
        version: string;
      };
      openapi: string;
      paths: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(openApiDocument.openapi).toEqual(expect.any(String));
    expect(openApiDocument.info).toEqual(
      expect.objectContaining({
        title: "Locus API",
        version: "0.11.0",
      })
    );
    expect(openApiDocument.paths).toEqual(
      expect.objectContaining({
        "/swagger-test": expect.any(Object),
      })
    );
  });
});
