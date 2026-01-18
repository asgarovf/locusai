import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@locusai/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
