import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Config } from "./configuration";

export interface SwaggerDocsConfig {
  enabled: boolean;
  username?: string;
  password?: string;
}

@Injectable()
export class TypedConfigService extends ConfigService<Config, true> {
  override get<K extends keyof Config>(key: K): Config[K] {
    return super.get(key, { infer: true });
  }

  getSwaggerDocsConfig(): SwaggerDocsConfig {
    return {
      enabled: this.get("SWAGGER_DOCS_ENABLED"),
      username: this.get("SWAGGER_DOCS_USERNAME"),
      password: this.get("SWAGGER_DOCS_PASSWORD"),
    };
  }
}
