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
  // Force-include non-imported runtime assets in the function bundle.
  // The quote PDF renderer reads pre-signed signature images via fs at
  // runtime; Next doesn't trace those automatically because they're not
  // `import`ed (they're binary).
  outputFileTracingIncludes: {
    "/api/admin/quotes": ["./src/lib/pdf/signatures/**"],
  },
};

export default nextConfig;
