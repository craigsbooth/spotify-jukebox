/** @type {import('next').NextConfig} */
const nextConfig = {
  // Existing config...
  async rewrites() {
    return [
      {
        // Hand off /login to the Backend
        source: '/login',
        destination: 'http://localhost:8888/login',
      },
      {
        // Hand off /api requests to the Backend (callback, session, etc)
        source: '/api/:path*',
        destination: 'http://localhost:8888/api/:path*',
      },
    ];
  },
};

export default nextConfig;