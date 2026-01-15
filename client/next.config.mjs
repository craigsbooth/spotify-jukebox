/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure we don't strict-check TS in production builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ROUTING FIXES
  async rewrites() {
    return [
      // 1. Fix Socket.IO Handshake (The 404 Error)
      {
        source: '/socket.io',
        destination: 'http://localhost:8888/socket.io/',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:8888/socket.io/:path*',
      },

      // 2. Fix the "Double API" Error (/api/api/quiz/devices -> /api/quiz/devices)
      {
        source: '/api/api/:path*',
        destination: 'http://localhost:8888/api/:path*',
      },

      // 3. Standard API Proxy (Backup for normal calls)
      {
        source: '/api/:path*',
        destination: 'http://localhost:8888/api/:path*',
      },
    ];
  },
};

export default nextConfig;