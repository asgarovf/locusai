import { ReportCiResult } from "@locusai/shared";
import { BaseModule } from "./base.js";

export class CiModule extends BaseModule {
  async report(body: ReportCiResult): Promise<{ success: boolean }> {
    const { data } = await this.api.post<{ success: boolean }>(
      "/ci/report",
      body
    );
    return data;
  }
}
