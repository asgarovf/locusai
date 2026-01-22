import { ReportCiResult, ReportCiResultSchema } from "@locusai/shared";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "@/auth/decorators";
import { MembershipRolesGuard } from "@/auth/guards";
import { ZodValidationPipe } from "@/common/pipes";
import { User } from "@/entities";
import { CiService } from "./ci.service";

@Controller("ci")
@UseGuards(MembershipRolesGuard)
export class CiController {
  constructor(private readonly ciService: CiService) {}

  @Post("report")
  async report(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(ReportCiResultSchema)) body: ReportCiResult
  ) {
    return this.ciService.reportResult(body, user.id);
  }
}
