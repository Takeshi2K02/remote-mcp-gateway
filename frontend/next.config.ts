import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Emits .next/standalone: server.js plus a node_modules containing only the
  // files Next traced as actually reachable at runtime. That is the whole
  // point here — an unpruned deploy package was 196 MB and Kudu rejected it
  // with HTTP_502.
  //
  // Standalone does NOT copy .next/static or public/ into that tree; the
  // deploy workflow copies both in before zipping. It also means the entry
  // point is `node server.js`, not `next start` — the App Service startup
  // command must match.
  //
  // This was removed once before, when Oryx built server-side on App Service
  // and the platform ran `next start`, which standalone does not support. The
  // build now happens on the GitHub runner, so that conflict is gone.
  output: "standalone",
};

export default nextConfig;
