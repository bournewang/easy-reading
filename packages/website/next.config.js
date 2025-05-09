/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only enable static export in production
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: 'dist',   // Change output directory to 'dist'
  images: {
    unoptimized: true  // Required for static export
  },
  // Only enable rewrites in development
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return [
      {
        source: '/api-proxy/:path*', // This is what apiClient calls (e.g., /api-proxy/auth/me)
        // This is where Next.js dev server sends the request.
        // :path* here will be 'auth/me' if the call was to /api-proxy/auth/me
        destination: 'http://api.english-reader.local/api/:path*',
      },
    ];
  }
};

module.exports = nextConfig; 