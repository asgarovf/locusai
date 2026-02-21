import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SuggestionsService } from "./suggestions.service";

@Injectable()
export class SuggestionExpiryTask {
  private readonly logger = new Logger(SuggestionExpiryTask.name);

  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiry(): Promise<void> {
    const expired = await this.suggestionsService.expireStale();
    if (expired > 0) {
      this.logger.log(`Expired ${expired} stale suggestion(s)`);
    }
  }
}
