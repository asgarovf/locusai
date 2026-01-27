import { Intent } from "../chains/intent";
import { createInterviewChain } from "../chains/interview";
import { BaseWorkflow, WorkflowContext } from "../core/workflow";
import {
  AgentChatMessage,
  AgentMode,
  AgentResponse,
} from "../interfaces/index";

export class InterviewWorkflow extends BaseWorkflow {
  readonly name = "Interview";
  readonly mode = AgentMode.INTERVIEW;

  canHandle(context: WorkflowContext): boolean {
    const isManifestComplete =
      !context.state.missingInfo || context.state.missingInfo.length === 0;

    // Trigger ONLY if intent is clearly interview and manifest is incomplete,
    // or if we are already in interview mode and continuing.
    // We NO LONGER hijack QUERY intent even if manifest is incomplete.
    return (
      (context.intent === Intent.INTERVIEW && !isManifestComplete) ||
      (context.state.mode === AgentMode.INTERVIEW &&
        context.intent === Intent.INTERVIEW)
    );
  }

  async execute(context: WorkflowContext): Promise<AgentResponse> {
    const { llm, state, input } = context;
    const interviewChain = createInterviewChain(llm);

    const historyText = state.history
      .slice(-5)
      .map((m: AgentChatMessage) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await interviewChain.invoke({
      input,
      manifest: JSON.stringify(state.manifest),
      history: historyText,
    });

    // Update state
    state.manifest = result.manifest;
    state.missingInfo = result.missingInfo;

    // Update completeness score
    const totalFields = 9;
    const filledFields = totalFields - (result.missingInfo?.length || 0);
    if (state.manifest) {
      state.manifest.completenessScore = Math.round(
        (filledFields / totalFields) * 100
      );
    }

    return {
      content: result.nextQuestion,
      suggestedActions: result.suggestedActions,
    };
  }
}
