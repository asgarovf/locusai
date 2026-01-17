/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@locus/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
