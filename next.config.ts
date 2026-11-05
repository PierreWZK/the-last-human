import type { NextConfig } from "next";

// The Docker image sets NEXT_OUTPUT=standalone so the runtime ships only what it needs.
const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
