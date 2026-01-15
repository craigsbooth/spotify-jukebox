/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure we don't strict-check TS in production builds
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;