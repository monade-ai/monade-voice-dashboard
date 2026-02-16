import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  // Do not inject secrets via `env` in next.config.ts.
  // Next.js exposes only `NEXT_PUBLIC_*` vars to the browser automatically; server-only env vars
  // should be provided at runtime (for standalone: container/service environment).
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;
