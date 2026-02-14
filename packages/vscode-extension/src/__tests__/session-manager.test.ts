import {
  SessionStatus,
  SessionTransitionEvent,
} from "@locusai/shared";
import { SessionManager } from "../sessions/session-manager";
import { SessionStore } from "../sessions/session-store";
import type { PersistedSessionData } from "../sessions/types";

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

// ============================================================================
// Test Helpers
// ============================================================================

const WORKSPACE_ID = "test-workspace-001";

function createStore(memento?: MockMemento): SessionStore {
  return new SessionStore(
    memento ?? new MockMemento(),
    WORKSPACE_ID
  );
}

function createManager(store?: SessionStore): SessionManager {
  return new SessionManager(store ?? createStore());
}

// ============================================================================
// Tests
// ============================================================================

describe("SessionManager", () => {
  describe("create", () => {
    it("creates a session in STARTING state", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "hello" });

      expect(record.data.sessionId).toBeDefined();
      expect(record.data.status).toBe(SessionStatus.STARTING);
      expect(record.data.prompt).toBe("hello");
      expect(record.data.createdAt).toBeGreaterThan(0);
      expect(record.data.updatedAt).toBe(record.data.createdAt);
      expect(record.bridge).toBeNull();
      expect(record.timeline).toEqual([]);
    });

    it("persists session to store on create", () => {
      const store = createStore();
      const manager = createManager(store);
      const record = manager.create({ prompt: "test" });

      const persisted = store.get(record.data.sessionId);
      expect(persisted).toBeDefined();
      expect(persisted!.sessionId).toBe(record.data.sessionId);
      expect(persisted!.status).toBe(SessionStatus.STARTING);
    });

    it("includes context and model when provided", () => {
      const manager = createManager();
      const context = {
        workspace: { rootPath: "/test" },
      };
      const record = manager.create({
        prompt: "test",
        context,
        model: "gpt-4",
      });

      expect(record.data.context).toEqual(context);
      expect(record.data.model).toBe("gpt-4");
    });

    it("generates unique session IDs", () => {
      const manager = createManager();
      const a = manager.create({ prompt: "a" });
      const b = manager.create({ prompt: "b" });

      expect(a.data.sessionId).not.toBe(b.data.sessionId);
    });
  });

  describe("get", () => {
    it("returns a session from the in-memory registry", () => {
      const manager = createManager();
      const created = manager.create({ prompt: "test" });
      const fetched = manager.get(created.data.sessionId);

      expect(fetched).toBe(created);
    });

    it("loads from store if not in registry", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // New manager with same store simulates registry loss
      const manager2 = new SessionManager(
        new SessionStore(memento, WORKSPACE_ID)
      );
      const fetched = manager2.get(sid);

      expect(fetched).toBeDefined();
      expect(fetched!.data.sessionId).toBe(sid);
      expect(fetched!.bridge).toBeNull();
    });

    it("returns undefined for unknown session", () => {
      const manager = createManager();
      expect(manager.get("nonexistent")).toBeUndefined();
    });
  });

  describe("list", () => {
    it("returns all persisted sessions", () => {
      const manager = createManager();
      manager.create({ prompt: "a" });
      manager.create({ prompt: "b" });

      const sessions = manager.list();
      expect(sessions.length).toBe(2);
    });

    it("returns empty array when no sessions exist", () => {
      const manager = createManager();
      expect(manager.list()).toEqual([]);
    });
  });

  describe("transition validity", () => {
    it("STARTING → CLI_SPAWNED → RUNNING", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      const updated = manager.transition(
        sid,
        SessionTransitionEvent.CLI_SPAWNED
      );
      expect(updated.data.status).toBe(SessionStatus.RUNNING);
    });

    it("RUNNING → FIRST_TEXT_DELTA → STREAMING", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      const updated = manager.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      expect(updated.data.status).toBe(SessionStatus.STREAMING);
    });

    it("STREAMING → RESULT_RECEIVED → COMPLETED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      const updated = manager.transition(
        sid,
        SessionTransitionEvent.RESULT_RECEIVED
      );
      expect(updated.data.status).toBe(SessionStatus.COMPLETED);
    });

    it("throws on invalid transition", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // STARTING → RESULT_RECEIVED is invalid
      expect(() => {
        manager.transition(
          sid,
          SessionTransitionEvent.RESULT_RECEIVED
        );
      }).toThrow("invalid transition");
    });

    it("throws on unknown session", () => {
      const manager = createManager();
      expect(() => {
        manager.transition(
          "nonexistent",
          SessionTransitionEvent.CLI_SPAWNED
        );
      }).toThrow("session not found");
    });

    it("STARTING → ERROR → FAILED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      const updated = manager.transition(
        sid,
        SessionTransitionEvent.ERROR
      );
      expect(updated.data.status).toBe(SessionStatus.FAILED);
    });

    it("RUNNING → USER_STOP → CANCELED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      const updated = manager.transition(
        sid,
        SessionTransitionEvent.USER_STOP
      );
      expect(updated.data.status).toBe(SessionStatus.CANCELED);
    });

    it("RUNNING → PROCESS_LOST → INTERRUPTED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      const updated = manager.transition(
        sid,
        SessionTransitionEvent.PROCESS_LOST
      );
      expect(updated.data.status).toBe(SessionStatus.INTERRUPTED);
    });

    it("STREAMING → PROCESS_LOST → INTERRUPTED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      const updated = manager.transition(
        sid,
        SessionTransitionEvent.PROCESS_LOST
      );
      expect(updated.data.status).toBe(SessionStatus.INTERRUPTED);
    });

    it("persists status after each transition", () => {
      const store = createStore();
      const manager = createManager(store);
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      expect(store.get(sid)!.status).toBe(SessionStatus.RUNNING);

      manager.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      expect(store.get(sid)!.status).toBe(SessionStatus.STREAMING);
    });

    it("updates updatedAt on transition", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;
      const beforeTs = record.data.updatedAt;

      // Small delay to ensure timestamp differs
      const updated = manager.transition(
        sid,
        SessionTransitionEvent.CLI_SPAWNED
      );
      expect(updated.data.updatedAt).toBeGreaterThanOrEqual(
        beforeTs
      );
    });
  });

  describe("resume", () => {
    it("transitions INTERRUPTED → RESUMING", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(
        sid,
        SessionTransitionEvent.PROCESS_LOST
      );

      const resumed = manager.resume(sid);
      expect(resumed.data.status).toBe(SessionStatus.RESUMING);
    });

    it("throws on non-INTERRUPTED session", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // Session is in STARTING state
      expect(() => manager.resume(sid)).toThrow(
        "invalid transition"
      );
    });

    it("throws on unknown session", () => {
      const manager = createManager();
      expect(() => manager.resume("nonexistent")).toThrow(
        "session not found"
      );
    });

    it("preserves timeline summary from before interruption", () => {
      const store = createStore();
      const manager = createManager(store);
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // Manually update summary to simulate accumulated timeline
      record.data.timelineSummary = {
        messageCount: 5,
        toolCount: 2,
        lastText: "partial response",
      };
      store.save(record.data);

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(
        sid,
        SessionTransitionEvent.PROCESS_LOST
      );

      const resumed = manager.resume(sid);
      expect(resumed.data.timelineSummary.messageCount).toBe(5);
      expect(resumed.data.timelineSummary.lastText).toBe(
        "partial response"
      );
    });
  });

  describe("stop", () => {
    it("transitions RUNNING → CANCELED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);

      const stopped = manager.stop(sid);
      expect(stopped.data.status).toBe(SessionStatus.CANCELED);
    });

    it("transitions STREAMING → CANCELED", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );

      const stopped = manager.stop(sid);
      expect(stopped.data.status).toBe(SessionStatus.CANCELED);
    });

    it("is a no-op on terminal session", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      manager.transition(
        sid,
        SessionTransitionEvent.RESULT_RECEIVED
      );

      const stopped = manager.stop(sid);
      expect(stopped.data.status).toBe(SessionStatus.COMPLETED);
    });

    it("transitions STARTING → FAILED via ERROR", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // STARTING does not support USER_STOP, so stop uses ERROR
      const stopped = manager.stop(sid);
      expect(stopped.data.status).toBe(SessionStatus.FAILED);
    });

    it("throws on unknown session", () => {
      const manager = createManager();
      expect(() => manager.stop("nonexistent")).toThrow(
        "session not found"
      );
    });

    it("cancels the bridge when stopping", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.transition(sid, SessionTransitionEvent.CLI_SPAWNED);

      let cancelCalled = false;
      record.bridge = {
        cancel: () => {
          cancelCalled = true;
        },
      } as any;

      manager.stop(sid);
      expect(cancelCalled).toBe(true);
      expect(record.bridge).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("removes session from registry and store", () => {
      const store = createStore();
      const manager = createManager(store);
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.cleanup(sid);

      expect(manager.get(sid)).toBeUndefined();
      expect(store.get(sid)).toBeUndefined();
    });

    it("cancels bridge before removal", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      let cancelCalled = false;
      record.bridge = {
        cancel: () => {
          cancelCalled = true;
        },
      } as any;

      manager.cleanup(sid);
      expect(cancelCalled).toBe(true);
    });

    it("is safe to call on unknown session", () => {
      const manager = createManager();
      expect(() => manager.cleanup("nonexistent")).not.toThrow();
    });
  });

  describe("reload recovery (reconcile)", () => {
    it("marks RUNNING sessions as INTERRUPTED", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      expect(store.get(sid)!.status).toBe(SessionStatus.RUNNING);

      // Simulate reload: new manager, same memento
      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      const recovered = manager2.get(sid);
      expect(recovered).toBeDefined();
      expect(recovered!.data.status).toBe(
        SessionStatus.INTERRUPTED
      );
      expect(recovered!.bridge).toBeNull();
    });

    it("marks STREAMING sessions as INTERRUPTED", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager1.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(sid)!.data.status).toBe(
        SessionStatus.INTERRUPTED
      );
    });

    it("marks STARTING sessions as INTERRUPTED", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // Session stuck in STARTING (CLI never spawned)
      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(sid)!.data.status).toBe(
        SessionStatus.INTERRUPTED
      );
    });

    it("marks RESUMING sessions as INTERRUPTED", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager1.transition(
        sid,
        SessionTransitionEvent.PROCESS_LOST
      );
      manager1.resume(sid);
      expect(store.get(sid)!.status).toBe(SessionStatus.RESUMING);

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(sid)!.data.status).toBe(
        SessionStatus.INTERRUPTED
      );
    });

    it("preserves COMPLETED sessions as-is", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager1.transition(
        sid,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      manager1.transition(
        sid,
        SessionTransitionEvent.RESULT_RECEIVED
      );

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(sid)!.data.status).toBe(
        SessionStatus.COMPLETED
      );
    });

    it("preserves FAILED sessions as-is", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.ERROR);

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(sid)!.data.status).toBe(
        SessionStatus.FAILED
      );
    });

    it("preserves INTERRUPTED sessions as-is", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      manager1.transition(
        sid,
        SessionTransitionEvent.PROCESS_LOST
      );

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(sid)!.data.status).toBe(
        SessionStatus.INTERRUPTED
      );
    });

    it("persists INTERRUPTED status back to store", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      // Verify persisted store was updated
      expect(store2.get(sid)!.status).toBe(
        SessionStatus.INTERRUPTED
      );
    });

    it("populates registry for all persisted sessions", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);

      const a = manager1.create({ prompt: "a" });
      const b = manager1.create({ prompt: "b" });
      manager1.transition(
        a.data.sessionId,
        SessionTransitionEvent.CLI_SPAWNED
      );
      manager1.transition(
        a.data.sessionId,
        SessionTransitionEvent.FIRST_TEXT_DELTA
      );
      manager1.transition(
        a.data.sessionId,
        SessionTransitionEvent.RESULT_RECEIVED
      );

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      expect(manager2.get(a.data.sessionId)).toBeDefined();
      expect(manager2.get(b.data.sessionId)).toBeDefined();
    });

    it("allows resume after reconcile", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager1.transition(sid, SessionTransitionEvent.CLI_SPAWNED);
      // Simulating crash — session is RUNNING

      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      // Session should be INTERRUPTED now, resumable
      const resumed = manager2.resume(sid);
      expect(resumed.data.status).toBe(SessionStatus.RESUMING);
    });
  });

  describe("workspace scoping", () => {
    it("isolates sessions between workspaces", () => {
      const memento = new MockMemento();
      const storeA = new SessionStore(memento, "workspace-a");
      const storeB = new SessionStore(memento, "workspace-b");

      const managerA = new SessionManager(storeA);
      const managerB = new SessionManager(storeB);

      managerA.create({ prompt: "from A" });
      managerB.create({ prompt: "from B" });

      expect(managerA.list().length).toBe(1);
      expect(managerA.list()[0].prompt).toBe("from A");
      expect(managerB.list().length).toBe(1);
      expect(managerB.list()[0].prompt).toBe("from B");
    });
  });

  describe("process registry (in-memory only)", () => {
    it("bridge is null after create", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      expect(record.bridge).toBeNull();
    });

    it("bridge is not serialized to store", () => {
      const store = createStore();
      const manager = createManager(store);
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      // Attach a mock bridge
      record.bridge = { cancel: () => undefined } as any;

      const persisted = store.get(sid);
      expect(persisted).toBeDefined();
      expect("bridge" in persisted!).toBe(false);
    });

    it("bridge is lost after simulated reload", () => {
      const memento = new MockMemento();
      const store = createStore(memento);
      const manager1 = createManager(store);
      const record = manager1.create({ prompt: "test" });
      const sid = record.data.sessionId;

      record.bridge = { cancel: () => undefined } as any;
      expect(record.bridge).not.toBeNull();

      // Simulate reload
      const store2 = new SessionStore(memento, WORKSPACE_ID);
      const manager2 = new SessionManager(store2);
      manager2.reconcile();

      const recovered = manager2.get(sid);
      expect(recovered!.bridge).toBeNull();
    });
  });

  describe("dispose", () => {
    it("cancels all active bridges", () => {
      const manager = createManager();
      const a = manager.create({ prompt: "a" });
      const b = manager.create({ prompt: "b" });

      const cancelled: string[] = [];
      a.bridge = {
        cancel: () => cancelled.push("a"),
      } as any;
      b.bridge = {
        cancel: () => cancelled.push("b"),
      } as any;

      manager.dispose();

      expect(cancelled).toContain("a");
      expect(cancelled).toContain("b");
    });

    it("clears the in-memory registry", () => {
      const manager = createManager();
      const record = manager.create({ prompt: "test" });
      const sid = record.data.sessionId;

      manager.dispose();
      // After dispose, get falls back to store
      const fetched = manager.get(sid);
      expect(fetched).toBeDefined();
      expect(fetched).not.toBe(record); // New instance
    });
  });
});

describe("SessionStore", () => {
  describe("persistence", () => {
    it("save and get round-trips data", () => {
      const store = createStore();
      const data: PersistedSessionData = {
        sessionId: "s1",
        status: SessionStatus.STARTING,
        createdAt: 1000,
        updatedAt: 1000,
        prompt: "hello",
        context: undefined,
        model: undefined,
        timelineSummary: {
          messageCount: 0,
          toolCount: 0,
          lastText: "",
        },
      };

      store.save(data);
      const loaded = store.get("s1");

      expect(loaded).toEqual(data);
    });

    it("getAll returns all saved sessions", () => {
      const store = createStore();

      const base = {
        status: SessionStatus.STARTING as const,
        createdAt: 1000,
        updatedAt: 1000,
        prompt: "test",
        context: undefined,
        model: undefined,
        timelineSummary: {
          messageCount: 0,
          toolCount: 0,
          lastText: "",
        },
      };

      store.save({ ...base, sessionId: "s1" });
      store.save({ ...base, sessionId: "s2" });

      const all = store.getAll();
      expect(all.length).toBe(2);
      const ids = all.map((s) => s.sessionId).sort();
      expect(ids).toEqual(["s1", "s2"]);
    });

    it("remove deletes a session", () => {
      const store = createStore();
      const data: PersistedSessionData = {
        sessionId: "s1",
        status: SessionStatus.STARTING,
        createdAt: 1000,
        updatedAt: 1000,
        prompt: "test",
        context: undefined,
        model: undefined,
        timelineSummary: {
          messageCount: 0,
          toolCount: 0,
          lastText: "",
        },
      };

      store.save(data);
      expect(store.get("s1")).toBeDefined();

      store.remove("s1");
      expect(store.get("s1")).toBeUndefined();
    });

    it("clear removes all sessions", () => {
      const store = createStore();
      const base = {
        status: SessionStatus.STARTING as const,
        createdAt: 1000,
        updatedAt: 1000,
        prompt: "test",
        context: undefined,
        model: undefined,
        timelineSummary: {
          messageCount: 0,
          toolCount: 0,
          lastText: "",
        },
      };

      store.save({ ...base, sessionId: "s1" });
      store.save({ ...base, sessionId: "s2" });

      store.clear();
      expect(store.getAll()).toEqual([]);
    });

    it("save overwrites existing session data", () => {
      const store = createStore();
      const data: PersistedSessionData = {
        sessionId: "s1",
        status: SessionStatus.STARTING,
        createdAt: 1000,
        updatedAt: 1000,
        prompt: "test",
        context: undefined,
        model: undefined,
        timelineSummary: {
          messageCount: 0,
          toolCount: 0,
          lastText: "",
        },
      };

      store.save(data);
      store.save({
        ...data,
        status: SessionStatus.RUNNING,
        updatedAt: 2000,
      });

      const loaded = store.get("s1");
      expect(loaded!.status).toBe(SessionStatus.RUNNING);
      expect(loaded!.updatedAt).toBe(2000);
    });
  });
});
