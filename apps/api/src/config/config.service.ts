import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Config } from "./configuration";

@Injectable()
export class TypedConfigService extends ConfigService<Config, true> {
  override get<K extends keyof Config>(key: K): Config[K] {
    return super.get(key, { infer: true });
  }
}
