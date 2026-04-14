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
      destination: 'http://api.english-reader.local/api/:path*',
    },
  ];
}

module.exports = nextConfig; 
