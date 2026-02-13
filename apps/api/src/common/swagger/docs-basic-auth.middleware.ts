import crypto from "node:crypto";
import { NextFunction, Request, Response } from "express";

const DOCS_AUTH_CHALLENGE = 'Basic realm="API Docs"';

export interface BasicAuthCredentials {
  username: string;
  password: string;
}

interface ParsedBasicAuthCredentials {
  username: string;
  password: string;
}

function unauthorized(response: Response): void {
  response.setHeader("WWW-Authenticate", DOCS_AUTH_CHALLENGE);
  response.status(401).send("Unauthorized");
}

function timingSafeStringEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicAuthHeader(
  authorizationHeader: string
): ParsedBasicAuthCredentials | null {
  const [scheme, encodedCredentials, ...remainder] =
    authorizationHeader.split(" ");

  if (
    scheme?.toLowerCase() !== "basic" ||
    !encodedCredentials ||
    remainder.length > 0
  ) {
    return null;
  }

  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
    "utf8"
  );
  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex < 0) {
    return null;
  }

  return {
    username: decodedCredentials.slice(0, separatorIndex),
    password: decodedCredentials.slice(separatorIndex + 1),
  };
}

export function createBasicAuthMiddleware(credentials: BasicAuthCredentials) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const authorizationHeader = request.headers.authorization;

    if (typeof authorizationHeader !== "string") {
      unauthorized(response);
      return;
    }

    const parsedCredentials = parseBasicAuthHeader(authorizationHeader);

    if (!parsedCredentials) {
      unauthorized(response);
      return;
    }

    const isUsernameValid = timingSafeStringEquals(
      parsedCredentials.username,
      credentials.username
    );
    const isPasswordValid = timingSafeStringEquals(
      parsedCredentials.password,
      credentials.password
    );

    if (!isUsernameValid || !isPasswordValid) {
      unauthorized(response);
      return;
    }

    next();
  };
}
