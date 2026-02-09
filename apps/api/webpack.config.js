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
      }),
    ],
  };
};
