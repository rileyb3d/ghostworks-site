import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.blob.vercel-storage.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "imgur.com", pathname: "/**" },
    ],
  },
  // Heavy, Node-only packages we don't want bundled by the build — they
  // get `require()`'d at runtime in the server function instead. pdfkit
  // ships fontkit + its own font data, which the bundler can't follow.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
