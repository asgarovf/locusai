/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@locusai/shared", "@locusai/sdk"],
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };

    // Externalize Node.js-only dependencies from browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        "node:fs": false,
        "node:child_process": false,
        "node:path": false,
      };
    }
    return config;
  },
};

export default nextConfig;
