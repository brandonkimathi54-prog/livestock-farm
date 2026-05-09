/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
  reactStrictMode: true,
  // Ensure your images (like new logo) are handled correctly
  images: {
    domains: ['localhost'],
  },
};

module.exports = withPWA(nextConfig);
