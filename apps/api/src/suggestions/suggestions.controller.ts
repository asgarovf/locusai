import {
  CreateSuggestion,
  CreateSuggestionSchema,
  SuggestionStatus,
  UpdateSuggestionStatus,
  UpdateSuggestionStatusSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Member } from "@/auth/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import {
  CreateSuggestionRequestDto,
  SuggestionResponseDto,
  SuggestionsResponseDto,
  UpdateSuggestionStatusRequestDto,
} from "@/common/swagger/public-api.dto";
import { SuggestionsService } from "./suggestions.service";

@ApiTags("Suggestions")
@ApiBearerAuth("bearer")
@ApiSecurity("apiKey")
@Controller("workspaces/:workspaceId/suggestions")
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @ApiOperation({ summary: "Create a new suggestion" })
  @ApiBody({ type: CreateSuggestionRequestDto })
  @ApiCreatedResponse({
    description: "Suggestion created successfully",
    type: SuggestionResponseDto,
  })
  @Post()
  @Member()
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateSuggestionSchema))
    body: CreateSuggestion
  ) {
    const suggestion = await this.suggestionsService.create(
      workspaceId,
      body
    );
    return { suggestion };
  }

  @ApiOperation({ summary: "List suggestions in a workspace" })
  @ApiQuery({ name: "status", enum: SuggestionStatus, required: false })
  @ApiOkResponse({
    description: "Suggestions fetched successfully",
    type: SuggestionsResponseDto,
  })
  @Get()
  @Member()
  async list(
    @Param("workspaceId") workspaceId: string,
    @Query("status") status?: SuggestionStatus
  ) {
    const suggestions = await this.suggestionsService.findByWorkspace(
      workspaceId,
      { status }
    );
    return { suggestions };
  }

  @ApiOperation({ summary: "Get a suggestion by ID" })
  @ApiOkResponse({
    description: "Suggestion fetched successfully",
    type: SuggestionResponseDto,
  })
  @Get(":id")
  @Member()
  async getById(@Param("id") id: string) {
    const suggestion = await this.suggestionsService.findOne(id);
    return { suggestion };
  }

  @ApiOperation({ summary: "Update suggestion status" })
  @ApiBody({ type: UpdateSuggestionStatusRequestDto })
  @ApiOkResponse({
    description: "Suggestion status updated successfully",
    type: SuggestionResponseDto,
  })
  @Patch(":id/status")
  @Member()
  async updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateSuggestionStatusSchema))
    body: UpdateSuggestionStatus
  ) {
    const suggestion = await this.suggestionsService.updateStatus(
      id,
      body.status
    );
    return { suggestion };
  }
}
