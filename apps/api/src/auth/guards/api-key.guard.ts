import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiKey } from "@/entities/api-key.entity";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class ApiKeyGuard {
  constructor(
    private reflector: Reflector,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException("API key not provided");
    }

    const keyRecord = await this.apiKeyRepository.findOne({
      where: { key: apiKey, active: true },
      relations: ["organization"],
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Invalid API key");
    }

    // Update last used time
    keyRecord.lastUsedAt = new Date();
    await this.apiKeyRepository.save(keyRecord);

    // Attach to request for use in controllers
    request.apiKey = keyRecord;
    request.organizationId = keyRecord.organizationId;

    return true;
  }

  private extractApiKey(request: unknown): string | undefined {
    const req = request as Record<string, Record<string, unknown>>;

    // Check Authorization header: "Bearer <key>" or "ApiKey <key>"
    const authHeader = req.headers?.authorization as string | undefined;
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts[0]?.toLowerCase() === "apikey" && parts[1]) {
        return parts[1];
      }
      if (parts[0]?.toLowerCase() === "bearer" && parts[1]) {
        return parts[1];
      }
    }

    // Check X-API-Key header
    const apiKeyHeader = req.headers?.["x-api-key"] as string | undefined;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return undefined;
  }
}
