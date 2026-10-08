import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static-first site deployed to GitHub Pages via .github/workflows/deploy.yml
  // (custom domain: public/CNAME → tuoruipeng.com).
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    // Static export cannot use the server image optimizer.
    unoptimized: true,
  },
};

export default nextConfig;
