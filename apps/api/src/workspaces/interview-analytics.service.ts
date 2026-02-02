import { EventType, ProjectManifestType } from "@locusai/shared";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Workspace } from "@/entities/workspace.entity";
import { EventsService } from "@/events/events.service";
import { ManifestValidatorService } from "./manifest-validator.service";

export interface ManifestChangeResult {
  previousFilledFields: Set<string>;
  currentFilledFields: Set<string>;
  newlyFilledFields: string[];
  previousPercentage: number;
  currentPercentage: number;
  wasStarted: boolean;
  wasCompleted: boolean;
}

@Injectable()
export class InterviewAnalyticsService {
  private readonly logger = new Logger(InterviewAnalyticsService.name);

  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly eventsService: EventsService,
    private readonly manifestValidator: ManifestValidatorService
  ) {}

  /**
   * Detects changes between old and new manifest states.
   * Returns information about which fields were filled and completion transitions.
   */
  detectManifestChanges(
    oldManifest: Partial<ProjectManifestType> | null | undefined,
    newManifest: Partial<ProjectManifestType> | null | undefined
  ): ManifestChangeResult {
    const oldCompletion =
      this.manifestValidator.calculateCompletion(oldManifest);
    const newCompletion =
      this.manifestValidator.calculateCompletion(newManifest);

    const previousFilledFields = new Set(
      oldCompletion.filledFields as string[]
    );
    const currentFilledFields = new Set(newCompletion.filledFields as string[]);

    // Find newly filled fields
    const newlyFilledFields: string[] = [];
    for (const field of currentFilledFields) {
      if (!previousFilledFields.has(field)) {
        newlyFilledFields.push(field);
      }
    }

    // Check for interview start (0% -> >0%)
    const wasStarted =
      oldCompletion.manifestCompletionPercentage === 0 &&
      newCompletion.manifestCompletionPercentage > 0;

    // Check for interview completion (any% -> 100% or threshold met)
    const wasCompleted =
      !oldCompletion.isManifestComplete && newCompletion.isManifestComplete;

    return {
      previousFilledFields,
      currentFilledFields,
      newlyFilledFields,
      previousPercentage: oldCompletion.manifestCompletionPercentage,
      currentPercentage: newCompletion.manifestCompletionPercentage,
      wasStarted,
      wasCompleted,
    };
  }

  /**
   * Tracks manifest changes and emits appropriate interview events.
   * Should be called from AiService.persistState() after manifest updates.
   */
  async trackManifestProgress(
    workspace: Workspace,
    oldManifest: Partial<ProjectManifestType> | null | undefined,
    newManifest: Partial<ProjectManifestType> | null | undefined,
    userId?: string
  ): Promise<void> {
    const changes = this.detectManifestChanges(oldManifest, newManifest);

    // Track interview start
    if (changes.wasStarted) {
      await this.emitInterviewStarted(
        workspace,
        changes.newlyFilledFields[0] || "unknown",
        userId
      );
    }

    // Track individual field completions
    for (const fieldName of changes.newlyFilledFields) {
      await this.emitFieldCompleted(
        workspace,
        fieldName,
        changes.currentPercentage,
        userId
      );
    }

    // Track interview completion
    if (changes.wasCompleted) {
      await this.emitInterviewCompleted(workspace, "interview", userId);
    }

    // Update last activity timestamp if any changes occurred
    if (changes.newlyFilledFields.length > 0) {
      await this.updateLastActivity(workspace.id);
    }
  }

  /**
   * Emits INTERVIEW_STARTED event when first manifest field is filled.
   */
  async emitInterviewStarted(
    workspace: Workspace,
    firstFieldName: string,
    userId?: string
  ): Promise<void> {
    this.logger.log(
      `Interview started for workspace ${workspace.id} (first field: ${firstFieldName})`
    );

    const now = new Date();

    // Update workspace tracking columns
    await this.workspaceRepo.update(workspace.id, {
      interviewStartedAt: now,
      interviewLastActivityAt: now,
    });

    await this.eventsService.logEvent({
      workspaceId: workspace.id,
      userId: userId || null,
      type: EventType.INTERVIEW_STARTED,
      payload: {
        workspaceName: workspace.name,
        firstFieldName,
      },
    });
  }

  /**
   * Emits INTERVIEW_FIELD_COMPLETED event for each newly filled field.
   */
  async emitFieldCompleted(
    workspace: Workspace,
    fieldName: string,
    completionPercentage: number,
    userId?: string
  ): Promise<void> {
    this.logger.debug(
      `Field completed for workspace ${workspace.id}: ${fieldName} (${completionPercentage}%)`
    );

    await this.eventsService.logEvent({
      workspaceId: workspace.id,
      userId: userId || null,
      type: EventType.INTERVIEW_FIELD_COMPLETED,
      payload: {
        fieldName,
        completionPercentage,
      },
    });
  }

  /**
   * Emits INTERVIEW_COMPLETED event when manifest reaches completion threshold.
   */
  async emitInterviewCompleted(
    workspace: Workspace,
    completedVia: "interview",
    userId?: string
  ): Promise<void> {
    const now = new Date();

    // Calculate time to complete
    let timeToCompleteMs = 0;
    if (workspace.interviewStartedAt) {
      timeToCompleteMs = now.getTime() - workspace.interviewStartedAt.getTime();
    } else {
      // Fallback to workspace creation time if startedAt not set
      timeToCompleteMs = now.getTime() - workspace.createdAt.getTime();
    }

    this.logger.log(
      `Interview completed for workspace ${workspace.id} via ${completedVia} (time: ${timeToCompleteMs}ms)`
    );

    // Update workspace tracking columns
    await this.workspaceRepo.update(workspace.id, {
      interviewCompletedAt: now,
      interviewLastActivityAt: now,
    });

    await this.eventsService.logEvent({
      workspaceId: workspace.id,
      userId: userId || null,
      type: EventType.INTERVIEW_COMPLETED,
      payload: {
        workspaceName: workspace.name,
        timeToCompleteMs,
        completedVia,
      },
    });
  }

  /**
   * Emits INTERVIEW_ABANDONED event for stale incomplete interviews.
   * Called by the scheduled abandonment detection job.
   */
  async emitInterviewAbandoned(
    workspace: Workspace,
    daysInactive: number
  ): Promise<void> {
    const completion = this.manifestValidator.calculateCompletion(
      workspace.projectManifest as Partial<ProjectManifestType>
    );

    this.logger.log(
      `Interview abandoned for workspace ${workspace.id} (${daysInactive} days inactive, ${completion.manifestCompletionPercentage}% complete)`
    );

    await this.eventsService.logEvent({
      workspaceId: workspace.id,
      userId: null,
      type: EventType.INTERVIEW_ABANDONED,
      payload: {
        workspaceName: workspace.name,
        lastActiveAt:
          workspace.interviewLastActivityAt?.toISOString() ||
          workspace.updatedAt.toISOString(),
        completionPercentage: completion.manifestCompletionPercentage,
        daysInactive,
      },
    });
  }

  /**
   * Updates the last activity timestamp for a workspace.
   */
  private async updateLastActivity(workspaceId: string): Promise<void> {
    await this.workspaceRepo.update(workspaceId, {
      interviewLastActivityAt: new Date(),
    });
  }

  /**
   * Finds workspaces with stale incomplete interviews.
   * Used by the abandonment detection job.
   */
  async findStaleInterviews(inactiveDays: number = 7): Promise<Workspace[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Find workspaces that:
    // 1. Have started the interview (interviewStartedAt is set)
    // 2. Have not completed (interviewCompletedAt is null)
    // 3. Have been inactive for > inactiveDays
    return this.workspaceRepo
      .createQueryBuilder("workspace")
      .where("workspace.interview_started_at IS NOT NULL")
      .andWhere("workspace.interview_completed_at IS NULL")
      .andWhere(
        "(workspace.interview_last_activity_at IS NULL OR workspace.interview_last_activity_at < :cutoffDate)",
        { cutoffDate }
      )
      .getMany();
  }
}
