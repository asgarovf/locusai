/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  transpilePackages: ["@locusai/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
