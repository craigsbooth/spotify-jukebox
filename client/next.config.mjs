/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure we don't strict-check TS in production builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ROUTING FIX: Proxy Socket.IO traffic to the backend
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:8888/socket.io/:path*', // Proxy to Backend
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8888/api/:path*', // Proxy API calls (Backup)
      },
    ];
  },
};

export default nextConfig;