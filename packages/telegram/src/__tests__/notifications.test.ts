import { describe, expect, it, beforeEach, mock } from "bun:test";
import { EventEmitter } from "events";
import type { Suggestion, SuggestionStatus, SuggestionType } from "@locusai/shared";
import { Notifier } from "../notifications.js";

// ── Mock Telegraf bot ──────────────────────────────────────────────────

function createMockBot() {
  const sentMessages: Array<{
    chatId: number;
    text: string;
    options: any;
  }> = [];

  const bot = {
    telegram: {
      sendMessage: mock((chatId: number, text: string, options?: any) => {
        sentMessages.push({ chatId, text, options });
        return Promise.resolve({ message_id: sentMessages.length });
      }),
    },
  } as any;

  return { bot, sentMessages };
}

function makeSuggestion(
  overrides: Partial<Suggestion> = {}
): Suggestion {
  return {
    id: "sug-123",
    type: "CODE_FIX" as SuggestionType,
    status: "NEW" as SuggestionStatus,
    title: "Fix lint errors",
    description: "Run the linter with --fix flag",
    workspaceId: "ws-1",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("Notifier", () => {
  let mockBot: ReturnType<typeof createMockBot>;
  let notifier: Notifier;
  const CHAT_ID = 12345;

  beforeEach(() => {
    mockBot = createMockBot();
    notifier = new Notifier(mockBot.bot, CHAT_ID);
  });

  describe("notifyProposal", () => {
    it("sends proposal with inline keyboard buttons", async () => {
      const suggestion = makeSuggestion({
        id: "prop-1",
        type: "NEXT_STEP" as SuggestionType,
        title: "Implement user authentication",
        description: "Add JWT-based auth to the API",
        metadata: { complexity: "medium", relatedBacklogItem: "Auth System" },
      });

      await notifier.notifyProposal(suggestion);

      expect(mockBot.sentMessages).toHaveLength(1);
      const msg = mockBot.sentMessages[0];

      // Check message content
      expect(msg.text).toContain("Proposal:");
      expect(msg.text).toContain("Implement user authentication");
      expect(msg.text).toContain("Add JWT-based auth to the API");
      expect(msg.text).toContain("Complexity:");
      expect(msg.text).toContain("3/5"); // medium → 3/5
      expect(msg.text).toContain("Related to:");
      expect(msg.text).toContain("Auth System");

      // Check inline keyboard
      expect(msg.options.reply_markup).toBeDefined();
      const keyboard = msg.options.reply_markup.inline_keyboard;
      expect(keyboard).toHaveLength(1);
      expect(keyboard[0]).toHaveLength(3);

      // Verify button labels and callback data
      expect(keyboard[0][0].text).toContain("Start");
      expect(keyboard[0][0].callback_data).toBe("proposal_start_prop-1");
      expect(keyboard[0][1].text).toContain("Skip");
      expect(keyboard[0][1].callback_data).toBe("proposal_skip_prop-1");
      expect(keyboard[0][2].text).toContain("Details");
      expect(keyboard[0][2].callback_data).toBe("proposal_details_prop-1");
    });

    it("displays low complexity as 2/5", async () => {
      const suggestion = makeSuggestion({
        metadata: { complexity: "low" },
      });

      await notifier.notifyProposal(suggestion);

      expect(mockBot.sentMessages[0].text).toContain("2/5");
    });

    it("displays high complexity as 4/5", async () => {
      const suggestion = makeSuggestion({
        metadata: { complexity: "high" },
      });

      await notifier.notifyProposal(suggestion);

      expect(mockBot.sentMessages[0].text).toContain("4/5");
    });

    it("defaults to 3/5 for unknown complexity", async () => {
      const suggestion = makeSuggestion({ metadata: {} });

      await notifier.notifyProposal(suggestion);

      expect(mockBot.sentMessages[0].text).toContain("3/5");
    });

    it("shows 'New initiative' when no related backlog item", async () => {
      const suggestion = makeSuggestion({ metadata: {} });

      await notifier.notifyProposal(suggestion);

      expect(mockBot.sentMessages[0].text).toContain("New initiative");
    });
  });

  describe("notifySuggestion", () => {
    it("sends suggestion with Fix/Skip/Details buttons", async () => {
      const suggestion = makeSuggestion({
        id: "sug-42",
        type: "CODE_FIX" as SuggestionType,
        title: "Fix 3 lint errors",
        description: "Run biome check --fix",
      });

      await notifier.notifySuggestion(suggestion);

      expect(mockBot.sentMessages).toHaveLength(1);
      const msg = mockBot.sentMessages[0];

      expect(msg.text).toContain("Suggestion:");
      expect(msg.text).toContain("Fix 3 lint errors");
      expect(msg.text).toContain("Run biome check --fix");
      expect(msg.text).toContain("Type:");
      expect(msg.text).toContain("CODE_FIX");

      // Check inline keyboard
      const keyboard = msg.options.reply_markup.inline_keyboard;
      expect(keyboard[0]).toHaveLength(3);
      expect(keyboard[0][0].text).toContain("Fix");
      expect(keyboard[0][0].callback_data).toBe("suggestion_fix_sug-42");
      expect(keyboard[0][1].text).toContain("Skip");
      expect(keyboard[0][1].callback_data).toBe("suggestion_skip_sug-42");
      expect(keyboard[0][2].text).toContain("Details");
      expect(keyboard[0][2].callback_data).toBe("suggestion_details_sug-42");
    });

    it("uses correct icon for DEPENDENCY_UPDATE type", async () => {
      const suggestion = makeSuggestion({
        type: "DEPENDENCY_UPDATE" as SuggestionType,
      });

      await notifier.notifySuggestion(suggestion);

      // 📦 is the dependency update icon
      expect(mockBot.sentMessages[0].text).toContain("📦");
    });

    it("uses correct icon for TEST_FIX type", async () => {
      const suggestion = makeSuggestion({
        type: "TEST_FIX" as SuggestionType,
      });

      await notifier.notifySuggestion(suggestion);

      expect(mockBot.sentMessages[0].text).toContain("🧪");
    });

    it("uses correct icon for REFACTOR type", async () => {
      const suggestion = makeSuggestion({
        type: "REFACTOR" as SuggestionType,
      });

      await notifier.notifySuggestion(suggestion);

      expect(mockBot.sentMessages[0].text).toContain("♻️");
    });
  });

  describe("connect", () => {
    it("subscribes to PROPOSALS_GENERATED and sends individual proposal notifications", async () => {
      const emitter = new EventEmitter();
      notifier.connect(emitter);

      const suggestions = [
        makeSuggestion({ id: "p1", title: "First proposal" }),
        makeSuggestion({ id: "p2", title: "Second proposal" }),
      ];

      emitter.emit("PROPOSALS_GENERATED", { suggestions });

      await new Promise((r) => setTimeout(r, 100));

      expect(mockBot.sentMessages).toHaveLength(2);
      expect(mockBot.sentMessages[0].text).toContain("First proposal");
      expect(mockBot.sentMessages[1].text).toContain("Second proposal");
    });
  });
});
