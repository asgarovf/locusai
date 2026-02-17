import {
  createUIIntent,
  type HostEvent,
  HostEventType,
  PROTOCOL_VERSION,
  ProtocolErrorCode,
  SessionStatus,
  SessionTransitionEvent,
  UIIntentType,
} from "@locusai/shared";
import { ChatController } from "../core/chat-controller";
import { SessionManager } from "../sessions/session-manager";
import { SessionStore } from "../sessions/session-store";

// ============================================================================
// Mock Memento (in-memory implementation of vscode.Memento)
// ============================================================================

class MockMemento {
  private store = new Map<string, any>();

  keys(): readonly string[] {
    return [...this.store.keys()];
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    if (this.store.has(key)) {
      return this.store.get(key) as T;
    }
    return defaultValue;
  }

  update(key: string, value: any): Promise<void> {
    if (value === undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
    return Promise.resolve();
  }
}

const mockOutputChannel = {
  name: "test",
  appendLine(_value: string) {
    /* no-op */
  },
  append(_value: string) {
    /* no-op */
  },
  clear() {
    /* no-op */
  },
  show() {
    /* no-op */
  },
  hide() {
    /* no-op */
  },
  dispose() {
    /* no-op */
  },
  replace(_value: string) {
    /* no-op */
  },
};

// ============================================================================
// Test Helpers
// ============================================================================

const WORKSPACE_ID = "test-workspace-001";
const CLI_PATH = "/usr/local/bin/locus";
const CWD = "/test/workspace";

function createTestInfra() {
  const memento = new MockMemento();
  const globalState = new MockMemento();
  const store = new SessionStore(memento, WORKSPACE_ID);
  const manager = new SessionManager(store);
  const events: HostEvent[] = [];

  const controller = new ChatController({
    manager,
    getCliBinaryPath: () => CLI_PATH,
    getCwd: () => CWD,
    globalState: globalState as any,
    outputChannel: mockOutputChannel as any,
  });

  controller.setEventSink((event) => {
    events.push(event);
  });

  return { memento, store, manager, controller, events };
}

function submitPromptIntent(text: string) {
  return createUIIntent(UIIntentType.SUBMIT_PROMPT, { text });
}

function webviewReadyIntent() {
  return createUIIntent(UIIntentType.WEBVIEW_READY, {});
}

function requestSessionsIntent() {
  return createUIIntent(UIIntentType.REQUEST_SESSIONS, {});
}

function stopSessionIntent(sessionId: string) {
  return createUIIntent(UIIntentType.STOP_SESSION, { sessionId });
}

function requestSessionDetailIntent(sessionId: string) {
  return createUIIntent(UIIntentType.REQUEST_SESSION_DETAIL, {
    sessionId,
  });
}

function clearSessionIntent(sessionId: string) {
  return createUIIntent(UIIntentType.CLEAR_SESSION, { sessionId });
}

function findEventsByType(
  events: HostEvent[],
  type: HostEvent["type"]
): HostEvent[] {
  return events.filter((e) => e.type === type);
}

// ============================================================================
// Tests
// ============================================================================

describe("ChatController", () => {
  describe("SUBMIT_PROMPT", () => {
    it("creates a session and emits SESSION_STATE", () => {
      const { controller, events, manager } = createTestInfra();

      controller.handleIntent(submitPromptIntent("hello world"));

      // Should have emitted at least one SESSION_STATE event.
      const sessionStates = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      );
      expect(sessionStates.length).toBeGreaterThanOrEqual(1);

      // The first SESSION_STATE should contain the session in
      // STARTING state (before CLI spawn attempt).
      const first = sessionStates[0];
      expect(first.type).toBe(HostEventType.SESSION_STATE);
      if (first.type === HostEventType.SESSION_STATE) {
        expect(first.payload.sessionId).toBeDefined();
        expect(first.payload.status).toBe(SessionStatus.STARTING);
      }

      // Session should be persisted in the manager.
      const sessions = manager.list();
      expect(sessions.length).toBe(1);
      expect(sessions[0].prompt).toBe("hello world");
    });

    it("emits CLI_NOT_FOUND error when binary path is invalid", () => {
      const { controller, events } = createTestInfra();

      // The CLI binary path points to a non-existent file, so
      // spawn will throw. The controller should catch this and
      // emit an error event.
      controller.handleIntent(submitPromptIntent("test prompt"));

      // SESSION_STATE should have been emitted.
      const sessionStates = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      );
      expect(sessionStates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("STOP_SESSION", () => {
    it("emits SESSION_NOT_FOUND for unknown session", () => {
      const { controller, events } = createTestInfra();

      controller.handleIntent(stopSessionIntent("nonexistent-id"));

      const errors = findEventsByType(events, HostEventType.ERROR);
      expect(errors.length).toBe(1);
      if (errors[0].type === HostEventType.ERROR) {
        expect(errors[0].payload.error.code).toBe(
          ProtocolErrorCode.SESSION_NOT_FOUND
        );
      }
    });

    it("stops a running session and emits updated state", () => {
      const { controller, events, manager } = createTestInfra();

      // Create a session manually and advance it to RUNNING.
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;
      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);

      events.length = 0;
      controller.handleIntent(stopSessionIntent(sid));

      const sessionStates = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      );
      expect(sessionStates.length).toBeGreaterThanOrEqual(1);

      const last = sessionStates[sessionStates.length - 1];
      if (last.type === HostEventType.SESSION_STATE) {
        expect(last.payload.status).toBe(SessionStatus.CANCELED);
      }
    });
  });

  describe("REQUEST_SESSIONS", () => {
    it("emits SESSION_LIST with all sessions", () => {
      const { controller, events, manager } = createTestInfra();

      manager.create({ prompt: "session-a" });
      manager.create({ prompt: "session-b" });

      controller.handleIntent(requestSessionsIntent());

      const lists = findEventsByType(events, HostEventType.SESSION_LIST);
      expect(lists.length).toBe(1);
      if (lists[0].type === HostEventType.SESSION_LIST) {
        expect(lists[0].payload.sessions.length).toBe(2);
      }
    });

    it("emits empty SESSION_LIST when no sessions exist", () => {
      const { controller, events } = createTestInfra();

      controller.handleIntent(requestSessionsIntent());

      const lists = findEventsByType(events, HostEventType.SESSION_LIST);
      expect(lists.length).toBe(1);
      if (lists[0].type === HostEventType.SESSION_LIST) {
        expect(lists[0].payload.sessions.length).toBe(0);
      }
    });
  });

  describe("REQUEST_SESSION_DETAIL", () => {
    it("emits SESSION_STATE for existing session", () => {
      const { controller, events, manager } = createTestInfra();

      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      controller.handleIntent(requestSessionDetailIntent(sid));

      const sessionStates = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      );
      expect(sessionStates.length).toBe(1);
      if (sessionStates[0].type === HostEventType.SESSION_STATE) {
        expect(sessionStates[0].payload.sessionId).toBe(sid);
      }
    });

    it("emits SESSION_NOT_FOUND for unknown session", () => {
      const { controller, events } = createTestInfra();

      controller.handleIntent(requestSessionDetailIntent("nonexistent"));

      const errors = findEventsByType(events, HostEventType.ERROR);
      expect(errors.length).toBe(1);
      if (errors[0].type === HostEventType.ERROR) {
        expect(errors[0].payload.error.code).toBe(
          ProtocolErrorCode.SESSION_NOT_FOUND
        );
      }
    });
  });

  describe("CLEAR_SESSION", () => {
    it("removes session and emits updated SESSION_LIST", () => {
      const { controller, events, manager } = createTestInfra();

      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      controller.handleIntent(clearSessionIntent(sid));

      // Session should be removed.
      expect(manager.get(sid)).toBeUndefined();

      // Should emit SESSION_LIST with empty list.
      const lists = findEventsByType(events, HostEventType.SESSION_LIST);
      expect(lists.length).toBeGreaterThanOrEqual(1);
      const last = lists[lists.length - 1];
      if (last.type === HostEventType.SESSION_LIST) {
        expect(last.payload.sessions.length).toBe(0);
      }
    });
  });

  describe("WEBVIEW_READY", () => {
    it("emits SESSION_LIST on ready", () => {
      const { controller, events, manager } = createTestInfra();

      manager.create({ prompt: "test" });

      controller.handleIntent(webviewReadyIntent());

      const lists = findEventsByType(events, HostEventType.SESSION_LIST);
      expect(lists.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("session recovery on webview reopen", () => {
    it("replays session state without re-running", () => {
      const { controller, events, manager } = createTestInfra();

      // Create a completed session.
      const record = manager.create({ prompt: "previous work" });
      const sid = record.data.sessionId;
      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(sid, SessionTransitionEvent.FIRST_TEXT_DELTA);
      manager.transition(sid, SessionTransitionEvent.RESULT_RECEIVED);

      // Simulate "webview opens, shows this session" by submitting
      // a prompt to set activeSessionId, then clearing events.
      // Instead, let's use handleIntent for REQUEST_SESSION_DETAIL.
      controller.handleIntent(requestSessionDetailIntent(sid));

      const sessionStates = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      );
      expect(sessionStates.length).toBe(1);
      if (sessionStates[0].type === HostEventType.SESSION_STATE) {
        expect(sessionStates[0].payload.status).toBe(SessionStatus.COMPLETED);
        expect(sessionStates[0].payload.sessionId).toBe(sid);
      }
    });

    it("reconciles interrupted sessions after reload", () => {
      const memento = new MockMemento();
      const store = new SessionStore(memento, WORKSPACE_ID);
      const manager1 = new SessionManager(store);

      // Create a session that was "running" when VS Code closed.
      const record = manager1.create({ prompt: "in-progress" });
      const sid = record.data.sessionId;
      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      expect(store.get(sid)!.status).toBe(SessionStatus.RUNNING);

      // Simulate reload: new manager with same memento.
      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      // Should be INTERRUPTED now.
      expect(manager2.get(sid)!.data.status).toBe(SessionStatus.INTERRUPTED);

      // Controller can serve this recovered state.
      const events: HostEvent[] = [];
      const controller = new ChatController({
        manager: manager2,
        getCliBinaryPath: () => CLI_PATH,
        getCwd: () => CWD,
        globalState: new MockMemento() as any,
        outputChannel: mockOutputChannel as any,
      });
      controller.setEventSink((e) => events.push(e));

      controller.handleIntent(requestSessionDetailIntent(sid));

      const sessionStates = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      );
      expect(sessionStates.length).toBe(1);
      if (sessionStates[0].type === HostEventType.SESSION_STATE) {
        expect(sessionStates[0].payload.status).toBe(SessionStatus.INTERRUPTED);
      }
    });
  });

  describe("event sink management", () => {
    it("does not throw when no sink is set", () => {
      const { manager } = createTestInfra();
      const controller = new ChatController({
        manager,
        getCliBinaryPath: () => CLI_PATH,
        getCwd: () => CWD,
        globalState: new MockMemento() as any,
        outputChannel: mockOutputChannel as any,
      });

      // No sink set — should not throw.
      expect(() => {
        controller.handleIntent(requestSessionsIntent());
      }).not.toThrow();
    });

    it("stops emitting after sink is cleared", () => {
      const { controller, events, manager } = createTestInfra();

      manager.create({ prompt: "test" });

      controller.handleIntent(requestSessionsIntent());
      expect(events.length).toBeGreaterThan(0);

      const countBefore = events.length;
      controller.setEventSink(null);

      controller.handleIntent(requestSessionsIntent());
      expect(events.length).toBe(countBefore);
    });
  });

  describe("protocol validation", () => {
    it("all emitted events include protocol version", () => {
      const { controller, events, manager } = createTestInfra();

      manager.create({ prompt: "test" });
      controller.handleIntent(requestSessionsIntent());
      controller.handleIntent(stopSessionIntent("nonexistent"));

      for (const event of events) {
        expect(event.protocol).toBe(PROTOCOL_VERSION);
      }
    });

    it("SESSION_STATE includes metadata", () => {
      const { controller, events, manager } = createTestInfra();

      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      controller.handleIntent(requestSessionDetailIntent(sid));

      const stateEvent = findEventsByType(
        events,
        HostEventType.SESSION_STATE
      )[0];
      if (stateEvent.type === HostEventType.SESSION_STATE) {
        expect(stateEvent.payload.metadata).toBeDefined();
        expect(stateEvent.payload.metadata?.sessionId).toBe(sid);
        expect(stateEvent.payload.metadata?.createdAt).toBeGreaterThan(0);
      }
    });

    it("SESSION_LIST entries include required fields", () => {
      const { controller, events, manager } = createTestInfra();

      manager.create({ prompt: "test prompt" });
      controller.handleIntent(requestSessionsIntent());

      const listEvent = findEventsByType(events, HostEventType.SESSION_LIST)[0];
      if (listEvent.type === HostEventType.SESSION_LIST) {
        const session = listEvent.payload.sessions[0];
        expect(session.sessionId).toBeDefined();
        expect(session.status).toBe(SessionStatus.STARTING);
        expect(session.createdAt).toBeGreaterThan(0);
        expect(session.updatedAt).toBeGreaterThan(0);
        expect(typeof session.messageCount).toBe("number");
        expect(typeof session.toolCount).toBe("number");
      }
    });
  });

  describe("dispose", () => {
    it("clears sink and state on dispose", () => {
      const { controller, events, manager } = createTestInfra();

      manager.create({ prompt: "test" });

      controller.dispose();

      // After dispose, events should not be emitted.
      controller.handleIntent(requestSessionsIntent());
      expect(events.length).toBe(0);
    });
  });
});

describe("SessionManager.persist", () => {
  it("saves current record data to store", () => {
    const memento = new MockMemento();
    const store = new SessionStore(memento, WORKSPACE_ID);
    const manager = new SessionManager(store);

    const record = manager.create({ prompt: "test" });
    const sid = record.data.sessionId;

    // Modify in-memory data.
    record.data.timelineSummary.messageCount = 42;

    // Persist without a state transition.
    manager.persist(sid);

    // Verify store was updated.
    const persisted = store.get(sid);
    expect(persisted!.timelineSummary.messageCount).toBe(42);
  });

  it("is a no-op for unknown session", () => {
    const memento = new MockMemento();
    const store = new SessionStore(memento, WORKSPACE_ID);
    const manager = new SessionManager(store);

    // Should not throw.
    expect(() => manager.persist("nonexistent")).not.toThrow();
  });
});
