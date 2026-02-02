import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */  experimental: {
    instrumentationHook: true,
  },};

export default nextConfig;
