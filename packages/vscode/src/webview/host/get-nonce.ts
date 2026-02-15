import * as crypto from "node:crypto";

export function getNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}
