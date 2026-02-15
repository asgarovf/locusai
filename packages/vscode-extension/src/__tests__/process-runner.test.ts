import { type ProcessExitResult, ProcessRunner } from "../core/process-runner";

describe("ProcessRunner", () => {
  let runner: ProcessRunner;

  afterEach(() => {
    runner?.removeAllListeners();
    if (runner?.running) {
      runner.kill();
    }
  });

  describe("spawn and stdout", () => {
    it("emits stdout-line for each line of output", async () => {
      runner = new ProcessRunner();
      const lines: string[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("stdout-line", (line) => lines.push(line));
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "echo",
        args: ["-e", "line1\\nline2\\nline3"],
      });

      const result = await done;
      expect(result.exitCode).toBe(0);
      expect(lines).toEqual(["line1", "line2", "line3"]);
    });

    it("handles single line without trailing newline", async () => {
      runner = new ProcessRunner();
      const lines: string[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("stdout-line", (line) => lines.push(line));
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "printf",
        args: ["no-newline"],
      });

      const result = await done;
      expect(result.exitCode).toBe(0);
      expect(lines).toEqual(["no-newline"]);
    });

    it("skips empty lines in stdout", async () => {
      runner = new ProcessRunner();
      const lines: string[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("stdout-line", (line) => lines.push(line));
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "echo",
        args: ["-e", "a\\n\\nb"],
      });

      const result = await done;
      expect(result.exitCode).toBe(0);
      expect(lines).toEqual(["a", "b"]);
    });
  });

  describe("stderr", () => {
    it("emits stderr-data for stderr output", async () => {
      runner = new ProcessRunner();
      const chunks: string[] = [];

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("stderr-data", (data) => chunks.push(data));
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "bash",
        args: ["-c", "echo error >&2"],
      });

      const result = await done;
      expect(result.exitCode).toBe(0);
      expect(chunks.join("").trim()).toBe("error");
    });
  });

  describe("exit codes", () => {
    it("reports non-zero exit code", async () => {
      runner = new ProcessRunner();

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "bash",
        args: ["-c", "exit 42"],
      });

      const result = await done;
      expect(result.exitCode).toBe(42);
      expect(result.cancelled).toBe(false);
      expect(result.timedOut).toBe(false);
      expect(result.signal).toBeNull();
    });
  });

  describe("cancellation", () => {
    it("cancel() sets cancelled flag and kills process", async () => {
      runner = new ProcessRunner();

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "sleep",
        args: ["60"],
      });

      // Give the process time to start
      await new Promise((r) => setTimeout(r, 50));
      expect(runner.running).toBe(true);

      runner.cancel();
      const result = await done;

      expect(result.cancelled).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(runner.running).toBe(false);
    });

    it("cancel() is a no-op on already-exited process", async () => {
      runner = new ProcessRunner();

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "true",
        args: [],
      });

      await done;
      // Should not throw
      runner.cancel();
    });
  });

  describe("timeout", () => {
    it("kills process after timeoutMs and sets timedOut flag", async () => {
      runner = new ProcessRunner();

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "sleep",
        args: ["60"],
        timeoutMs: 100,
      });

      const result = await done;
      expect(result.timedOut).toBe(true);
      expect(result.cancelled).toBe(false);
    });
  });

  describe("spawn error", () => {
    it("emits error for non-existent binary", async () => {
      runner = new ProcessRunner();

      const errorPromise = new Promise<Error>((resolve) => {
        runner.on("error", resolve);
      });

      runner.spawn({
        command: "/nonexistent/binary/path",
        args: [],
      });

      const err = await errorPromise;
      expect(err.message).toContain("ENOENT");
    });

    it("throws if spawn() called twice", () => {
      runner = new ProcessRunner();
      runner.spawn({ command: "true", args: [] });

      expect(() => {
        runner.spawn({ command: "true", args: [] });
      }).toThrow("spawn() called more than once");
    });
  });

  describe("kill", () => {
    it("forcefully kills the process", async () => {
      runner = new ProcessRunner();

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "sleep",
        args: ["60"],
      });

      await new Promise((r) => setTimeout(r, 50));
      runner.kill();

      const result = await done;
      expect(result.signal).toBe("SIGKILL");
    });
  });

  describe("properties", () => {
    it("exposes pid after spawn", async () => {
      runner = new ProcessRunner();

      const done = new Promise<ProcessExitResult>((resolve) => {
        runner.on("exit", resolve);
      });

      runner.spawn({
        command: "sleep",
        args: ["60"],
      });

      expect(runner.pid).toBeDefined();
      expect(typeof runner.pid).toBe("number");

      runner.kill();
      await done;
    });

    it("running is false before spawn", () => {
      runner = new ProcessRunner();
      expect(runner.running).toBe(false);
    });
  });
});
