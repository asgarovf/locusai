import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
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
