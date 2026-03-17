import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  eslint: {
    ignoreDuringBuilds: true,
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/turnero",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;