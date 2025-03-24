/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static HTML export
  distDir: 'dist',   // Change output directory to 'dist'
  images: {
    unoptimized: true  // Required for static export
  }
};

module.exports = nextConfig; 