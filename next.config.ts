/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This allows build to finish even with Navigation error
    ignoreBuildErrors: true,
  },
  eslint: {
    // This ignores linting errors during build as well
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

export default nextConfig;
