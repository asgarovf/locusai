/**
 * Shared stdin prompt utilities for auth flows.
 */

import { createInterface } from "node:readline";

/**
 * Prompt the user for input via stdin. When `hide` is true and stdin is a TTY,
 * input characters are not echoed (for passwords/tokens).
 */
export function prompt(question: string, hide = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    if (hide && process.stdin.isTTY) {
      process.stderr.write(question);
      let input = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf-8");
      const onData = (ch: string) => {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          rl.close();
          process.stderr.write("\n");
          resolve(input);
        } else if (ch === "\u0003") {
          process.stderr.write("\n");
          process.exit(1);
        } else if (ch === "\u007f" || ch === "\b") {
          if (input.length > 0) input = input.slice(0, -1);
        } else {
          input += ch;
        }
      };
      process.stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Normalize a URL: trim whitespace, strip trailing slashes,
 * and prepend `https://` if no protocol is given.
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}
