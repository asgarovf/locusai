import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { TypedConfigService } from "@/config/config.service";

@Injectable()
export class EncryptionService {
  private readonly key: Buffer | null = null;

  constructor(private configService: TypedConfigService) {
    const hex = this.configService.get("ENCRYPTION_KEY");
    if (hex) {
      this.key = Buffer.from(hex, "hex");
    }
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error("ENCRYPTION_KEY is not configured. Cannot encrypt data.");
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  decrypt(ciphertext: string): string {
    if (!this.key) {
      throw new Error("ENCRYPTION_KEY is not configured. Cannot decrypt data.");
    }

    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
