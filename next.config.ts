import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    domains: [
      "ferf1mheo22r9ira.public.blob.vercel-storage.com",
      "petrosphere.com.ph",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "petrosphere.com.ph",
      },
    ],
  },
};

export default nextConfig;
