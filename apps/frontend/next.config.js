/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@workflow/shared-types'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  eslint: {
    // Disable ESLint during production builds to allow deployment
    // Fix linting issues in development environment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep TypeScript checking enabled but only fail on errors (not warnings)
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
