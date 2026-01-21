/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@locusai/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
