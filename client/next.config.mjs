/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure we don't strict-check TS in production builds (saves memory/time)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize for standalone deployment (Docker/AWS)
  output: "standalone",
};

export default nextConfig;