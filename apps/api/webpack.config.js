const path = require("node:path");
const nodeExternals = require("webpack-node-externals");

// biome-ignore lint/complexity/useArrowFunction: Must be a function to be compatible with NestJS
module.exports = function (options) {
  return {
    ...options,
    // Override externals to bundle workspace packages (@locusai/*)
    // instead of requiring them at runtime. Node v22+ with "type": "module"
    // in root package.json cannot natively require workspace packages
    // that use ESM TypeScript source.
    externals: [
      nodeExternals({
        allowlist: [/^@locusai\//],
        // In this Bun workspace monorepo, dependencies are hoisted to the
        // root node_modules/. Without this, webpack-node-externals only scans
        // apps/api/node_modules/ (which is empty) and incorrectly bundles
        // hoisted packages like swagger-ui-dist, breaking their __dirname
        // resolution at runtime.
        additionalModuleDirs: [path.resolve(__dirname, "../../node_modules")],
      }),
    ],
  };
};
