import {
  AuthenticatedUser,
  ReportCiResult,
  ReportCiResultSchema,
} from "@locusai/shared";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { CurrentUser, Member } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { CiService } from "./ci.service";

@Controller("ci")
export class CiController {
  constructor(private readonly ciService: CiService) {}

  @Post("report/:workspaceId")
  @Member()
  async report(
    @CurrentUser() user: AuthenticatedUser,
    @Param("workspaceId") workspaceId: string,
    @Body(
      new ZodValidationPipe(ReportCiResultSchema.omit({ workspaceId: true }))
    )
    body: Omit<ReportCiResult, "workspaceId">
  ) {
    return this.ciService.reportResult(
      { ...body, workspaceId } as ReportCiResult,
      user
    );
  }
}
