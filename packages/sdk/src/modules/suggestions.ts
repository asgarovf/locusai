import {
  CreateSuggestion,
  Suggestion,
  UpdateSuggestionStatus,
} from "@locusai/shared";
import { BaseModule } from "./base.js";

interface SuggestionResponse {
  suggestion: Suggestion;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export interface SuggestionListOptions {
  status?: string;
}

export class SuggestionsModule extends BaseModule {
  async create(
    workspaceId: string,
    data: CreateSuggestion
  ): Promise<Suggestion> {
    const { data: res } = await this.api.post<SuggestionResponse>(
      `/workspaces/${workspaceId}/suggestions`,
      data
    );
    return res.suggestion;
  }

  async list(
    workspaceId: string,
    params?: SuggestionListOptions
  ): Promise<Suggestion[]> {
    const { data } = await this.api.get<SuggestionsResponse>(
      `/workspaces/${workspaceId}/suggestions`,
      { params }
    );
    return data.suggestions;
  }

  async get(workspaceId: string, id: string): Promise<Suggestion> {
    const { data } = await this.api.get<SuggestionResponse>(
      `/workspaces/${workspaceId}/suggestions/${id}`
    );
    return data.suggestion;
  }

  async updateStatus(
    workspaceId: string,
    id: string,
    status: UpdateSuggestionStatus
  ): Promise<Suggestion> {
    const { data } = await this.api.patch<SuggestionResponse>(
      `/workspaces/${workspaceId}/suggestions/${id}/status`,
      status
    );
    return data.suggestion;
  }
}
