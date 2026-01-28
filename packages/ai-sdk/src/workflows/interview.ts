import { Intent } from "../chains/intent";
import { createInterviewChain } from "../chains/interview";
import { REQUIRED_MANIFEST_FIELDS } from "../constants";
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
    // If intent is explicitly INTERVIEW, we handle it.
    if (context.intent === Intent.INTERVIEW) return true;

    // If we are currently in INTERVIEW mode and the intent is UNKNOWN, we continue the interview.
    // If the intent is anything else (e.g., DOCUMENTING), we let the other workflow handle it.
    return (
      context.state.mode === AgentMode.INTERVIEW &&
      context.intent === Intent.UNKNOWN
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
    const totalFields = REQUIRED_MANIFEST_FIELDS.length;
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
