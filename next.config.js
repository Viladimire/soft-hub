/** @type {import('next').NextConfig} */
const repoName = "soft-hub";
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : "",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Security headers disabled for static export
  // Note: Custom headers require Next.js with server support
  // Will be handled by Cloudflare instead
};

module.exports = nextConfig;
