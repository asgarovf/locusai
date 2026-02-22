#!/usr/bin/env node

// Suppress DEP0040 (punycode) deprecation from tr46 transitive dependency
// (telegraf → node-fetch → whatwg-url → tr46 → punycode)
const _emit = process.emit;
// biome-ignore lint/complexity/useArrowFunction: Needs to be ignored
process.emit = function (name, data, ...args) {
  if (name === "warning" && data?.code === "DEP0040") return false;
  return _emit.apply(process, [name, data, ...args]);
};

await import("./src/cli");
