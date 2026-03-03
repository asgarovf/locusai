#!/usr/bin/env node
export {};

// Suppress DEP0040 (punycode) deprecation warning from grammy's dependency chain:
// grammy → node-fetch@2 → whatwg-url@5 → tr46@0.0.3 → punycode (deprecated built-in)
// Dynamic import below ensures this filter is active before grammy loads.
const origEmit = process.emit as (event: string, ...args: unknown[]) => boolean;

(process as { emit: (event: string, ...args: unknown[]) => boolean }).emit = (
  event: string,
  ...args: unknown[]
) => {
  const data = args[0];
  if (
    event === "warning" &&
    typeof data === "object" &&
    data !== null &&
    (data as { name?: string; code?: string }).name === "DeprecationWarning" &&
    (data as { name?: string; code?: string }).code === "DEP0040"
  ) {
    return false;
  }
  return origEmit.call(process, event, ...args);
};

const { main } = await import("./index.js");

main(process.argv.slice(2)).catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
