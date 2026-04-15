const isProduction = process.env.NODE_ENV === 'production';

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
      destination: 'http://127.0.0.1:8000/api/:path*',
    },
  ];
}

module.exports = nextConfig; 
