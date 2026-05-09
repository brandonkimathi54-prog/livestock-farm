/** @type {import('next').NextConfig } */

const nextConfig: NextConfig = {
  experimental: {
    pwa: {
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
    },
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig;
