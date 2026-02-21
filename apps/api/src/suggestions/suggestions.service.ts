import {
  CreateSuggestion,
  SuggestionStatus,
  SUGGESTION_TTL_HOURS,
} from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { Suggestion } from "@/entities/suggestion.entity";

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(Suggestion)
    private readonly suggestionRepository: Repository<Suggestion>
  ) {}

  async create(
    workspaceId: string,
    data: CreateSuggestion
  ): Promise<Suggestion> {
    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + SUGGESTION_TTL_HOURS * 60 * 60 * 1000);

    const suggestion = this.suggestionRepository.create({
      workspaceId,
      type: data.type,
      title: data.title,
      description: data.description,
      jobRunId: data.jobRunId ?? null,
      metadata: data.metadata ?? null,
      expiresAt,
    });

    const saved = await this.suggestionRepository.save(suggestion);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findByWorkspace(
    workspaceId: string,
    filters?: { status?: SuggestionStatus }
  ): Promise<Suggestion[]> {
    const where: Record<string, unknown> = { workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.suggestionRepository.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Suggestion> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id },
    });
    if (!suggestion) throw new NotFoundException("Suggestion not found");
    return suggestion;
  }

  async updateStatus(
    id: string,
    status: SuggestionStatus
  ): Promise<Suggestion> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id },
    });
    if (!suggestion) throw new NotFoundException("Suggestion not found");

    suggestion.status = status;

    const saved = await this.suggestionRepository.save(suggestion);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async expireStale(): Promise<number> {
    const result = await this.suggestionRepository
      .createQueryBuilder()
      .update(Suggestion)
      .set({ status: SuggestionStatus.EXPIRED })
      .where("status IN (:...statuses)", {
        statuses: [SuggestionStatus.NEW, SuggestionStatus.NOTIFIED],
      })
      .andWhere("expires_at < :now", { now: new Date() })
      .execute();

    return result.affected ?? 0;
  }
}
