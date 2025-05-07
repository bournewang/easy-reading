/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  distDir: 'dist',
  experimental: {
    serverActions: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' }
        ],
      },
    ];
  },
};

export default nextConfig; 