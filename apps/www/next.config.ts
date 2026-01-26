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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://widget.whelp.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://www.google-analytics.com https://*.whelp.co",
              "font-src 'self' https://widget.whelp.co",
              "frame-src 'self' https://www.youtube.com",
              "media-src 'self' https://*.whelp.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
              "connect-src 'self' https://*.locusai.dev https://*.google-analytics.com https://analytics.google.com https://*.whelp.co",
            ].join("; "),
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
