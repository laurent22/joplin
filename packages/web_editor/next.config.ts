import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['faiss-node', 'keytar', 'sharp'],
};

export default nextConfig;
