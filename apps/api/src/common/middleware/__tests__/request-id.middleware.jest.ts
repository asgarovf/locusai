import "reflect-metadata";

import { RequestIdMiddleware } from "../request-id.middleware";

describe("RequestIdMiddleware", () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it("should generate a UUID request ID when none is provided", () => {
    const req = { headers: {} } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    // Should set request ID on request headers
    expect(req.headers["x-request-id"]).toBeDefined();
    expect(req.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    // Should set request ID on response headers
    expect(res.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      req.headers["x-request-id"]
    );

    // Should call next
    expect(next).toHaveBeenCalled();
  });

  it("should preserve existing X-Request-ID from incoming request", () => {
    const existingId = "existing-request-id-123";
    const req = { headers: { "x-request-id": existingId } } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers["x-request-id"]).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", existingId);
    expect(next).toHaveBeenCalled();
  });

  it("should set the same ID on both request and response", () => {
    const req = { headers: {} } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    const requestId = req.headers["x-request-id"];
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", requestId);
  });

  it("should generate unique IDs for different requests", () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const req = { headers: {} } as any;
      const res = { setHeader: jest.fn() } as any;
      const next = jest.fn();

      middleware.use(req, res, next);
      ids.add(req.headers["x-request-id"]);
    }

    // All 100 IDs should be unique
    expect(ids.size).toBe(100);
  });

  it("should always call next()", () => {
    const req = { headers: {} } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
