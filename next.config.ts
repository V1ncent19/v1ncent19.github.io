import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static-first site deployed on Cloudflare Pages.
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    // Static export cannot use the server image optimizer.
    unoptimized: true,
  },
};

export default nextConfig;
