import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Suggestion } from "@/entities";
import { SuggestionExpiryTask } from "./suggestion-expiry.task";
import { SuggestionsController } from "./suggestions.controller";
import { SuggestionsService } from "./suggestions.service";

@Module({
  imports: [TypeOrmModule.forFeature([Suggestion])],
  controllers: [SuggestionsController],
  providers: [SuggestionsService, SuggestionExpiryTask],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
