import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import * as esbuild from "esbuild";

const outdir = join(import.meta.dirname, "..", "dist", "webview");
const entryPoint = join(
  import.meta.dirname,
  "..",
  "src",
  "webview",
  "app",
  "main.ts"
);
const cssEntry = join(
  import.meta.dirname,
  "..",
  "src",
  "webview",
  "app",
  "styles.css"
);

const isWatch = process.argv.includes("--watch");

// Clean stale hashed files before rebuild
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

/** @type {import("esbuild").BuildOptions} */
const buildOptions = {
  entryPoints: [entryPoint, cssEntry],
  bundle: true,
  outdir,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: !isWatch,
  sourcemap: isWatch,
  entryNames: "[name]-[hash]",
  metafile: true,
  logLevel: "info",
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("[webview] watching for changes…");
} else {
  const result = await esbuild.build(buildOptions);
  writeManifest(result.metafile);
  console.log("[webview] build complete");
}

/**
 * Write a manifest mapping logical entry names to hashed output filenames.
 * @param {import("esbuild").Metafile} metafile
 */
function writeManifest(metafile) {
  const manifest = {};
  for (const [outputPath, meta] of Object.entries(metafile.outputs)) {
    if (meta.entryPoint) {
      const name = basename(meta.entryPoint);
      const ext = name.endsWith(".css") ? ".css" : ".js";
      const logicalName = `${name.replace(/\.[^.]+$/, "")}${ext}`;
      manifest[logicalName] = basename(outputPath);
    }
  }

  // CSS files appear as outputs without entryPoint when bundled with JS.
  // Also handle standalone CSS entry.
  for (const [outputPath] of Object.entries(metafile.outputs)) {
    const out = basename(outputPath);
    if (out.endsWith(".css") && !Object.values(manifest).includes(out)) {
      const entry = Object.entries(metafile.outputs).find(
        ([p]) => p === outputPath
      );
      if (entry?.[1].entryPoint) {
        const name = basename(entry[1].entryPoint);
        const logicalName = `${name.replace(/\.[^.]+$/, "")}.css`;
        manifest[logicalName] = out;
      }
    }
  }

  writeFileSync(
    join(outdir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
