import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // NOTE: do not add `output: "standalone"` here. It was removed when the
  // frontend moved from Azure Container Apps to Azure App Service.
  // Standalone mode emits .next/standalone/server.js and deliberately omits
  // .next/static and public/, expecting a Dockerfile to copy them in
  // alongside it. App Service instead runs `npm start` (`next start`), which
  // does not support standalone output, so re-enabling it would deploy green
  // and then serve a broken site.
};

export default nextConfig;
