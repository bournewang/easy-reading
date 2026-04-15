const isProduction = process.env.NODE_ENV === 'production';
const localApiBase = process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8010';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isProduction ? 'export' : undefined,
  trailingSlash: isProduction,
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

if (!isProduction) {
  nextConfig.rewrites = async () => [
    {
      source: '/api-proxy/:path*',
      destination: `${localApiBase.replace(/\/$/, '')}/api/:path*`,
    },
  ];
}

module.exports = nextConfig; 
