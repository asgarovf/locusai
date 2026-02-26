#!/usr/bin/env node
/**
 * locus-telegram binary entry point.
 *
 * This file is the executable registered in package.json "bin".
 * It simply imports the compiled dist/index.js which is built from
 * the TypeScript source by `bun run build`.
 *
 * Build:  bun run build   (from packages/telegram/)
 * Output: dist/index.js
 */
import "../dist/index.js";
