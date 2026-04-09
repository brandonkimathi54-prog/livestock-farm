import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iahbgndenupboqehmlqj.supabase.co",
      },
    ],
  },
};

export default nextConfig;
