import { build } from "esbuild";

// Build extension (Node.js context)
await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  minify: false,
});

// Build webview script (browser context)
await build({
  entryPoints: ["src/webview/main.js"],
  bundle: true,
  outfile: "dist/webview/main.js",
  format: "iife",
  platform: "browser",
  target: "es2020",
  sourcemap: false,
  minify: true,
});

console.log("Build complete.");
