import { NextFunction, Request, Response } from "express";
import { createBasicAuthMiddleware } from "../docs-basic-auth.middleware";

function createMockResponse(): jest.Mocked<Response> {
  const response = {
    setHeader: jest.fn(),
    status: jest.fn(),
    send: jest.fn(),
  } as unknown as jest.Mocked<Response>;

  response.status.mockReturnValue(response);
  response.send.mockReturnValue(response);

  return response;
}

describe("createBasicAuthMiddleware", () => {
  const middleware = createBasicAuthMiddleware({
    username: "docs-user",
    password: "docs-password",
  });

  it("should return 401 with challenge when authorization header is missing", () => {
    const request = { headers: {} } as Request;
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(
      "WWW-Authenticate",
      'Basic realm="API Docs"'
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith("Unauthorized");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when authorization scheme is not basic", () => {
    const request = {
      headers: { authorization: "Bearer token" },
    } as Request;
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(
      "WWW-Authenticate",
      'Basic realm="API Docs"'
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 with challenge when credentials are invalid", () => {
    const invalidCredentials = Buffer.from("docs-user:wrong-password").toString(
      "base64"
    );
    const request = {
      headers: { authorization: `Basic ${invalidCredentials}` },
    } as Request;
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith(
      "WWW-Authenticate",
      'Basic realm="API Docs"'
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.send).toHaveBeenCalledWith("Unauthorized");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next when credentials are valid", () => {
    const validCredentials = Buffer.from("docs-user:docs-password").toString(
      "base64"
    );
    const request = {
      headers: { authorization: `Basic ${validCredentials}` },
    } as Request;
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
