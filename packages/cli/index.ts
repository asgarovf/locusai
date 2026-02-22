#!/usr/bin/env node
// @ts-nocheck

// Suppress DEP0040 (punycode) deprecation from tr46 transitive dependency
// (telegraf → node-fetch → whatwg-url → tr46 → punycode)
const _emit = process.emit;
// biome-ignore lint/complexity/useArrowFunction: Needs to be ignored
// biome-ignore lint/suspicious/noExplicitAny: Overriding process.emit signature
process.emit = function (name: string, data: any, ...args: any[]) {
  if (name === "warning" && data?.code === "DEP0040") return false;
  return _emit.apply(process, [name, data, ...args] as unknown);
};

import "./src/cli";
