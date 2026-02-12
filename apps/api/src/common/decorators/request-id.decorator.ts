import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export const RequestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.requestId;
  }
);
