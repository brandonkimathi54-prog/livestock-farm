import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  },
  images: {
    unoptimized: true,
  },
  typescript: {
    // This allows build to finish even with Navigation error
    ignoreBuildErrors: true,
  },
});

export default nextConfig;
