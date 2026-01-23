import {
  AuthenticatedUser,
  MembershipRole,
  ReportCiResult,
  ReportCiResultSchema,
} from "@locusai/shared";
import { Body, Controller, Param, Post } from "@nestjs/common";
import { CurrentUser, MembershipRoles } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { CiService } from "./ci.service";

@Controller("ci")
export class CiController {
  constructor(private readonly ciService: CiService) {}

  @Post("report/:workspaceId")
  @MembershipRoles(
    MembershipRole.OWNER,
    MembershipRole.ADMIN,
    MembershipRole.MEMBER
  )
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
