import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@locusai/shared",
    "react-markdown",
    "vfile",
    "vfile-message",
    "unified",
    "bail",
    "is-plain-obj",
    "trough",
    "remark-parse",
    "remark-rehype",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
