/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Fix image optimization issues with static export
  images: {
    unoptimized: true,
  },
  // Disable server features for static export
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig