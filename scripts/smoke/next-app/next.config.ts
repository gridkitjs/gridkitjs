import type { NextConfig } from "next";

// The app is built from a temp copy; pinning the root stops Next from
// adopting a lockfile it finds in a parent folder as the workspace root.
const nextConfig: NextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
