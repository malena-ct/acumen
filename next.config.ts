import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['googleapis', 'google-auth-library'],
};

export default nextConfig;
