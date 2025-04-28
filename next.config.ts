import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DAILY_ROOM_URL: process.env.NEXT_PUBLIC_DAILY_ROOM_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    EXOTEL_API_URL: process.env.EXOTEL_API_URL,
    EXOTEL_API_KEY: process.env.EXOTEL_API_KEY,
    EXOTEL_FUNCTIONS_KEY: process.env.EXOTEL_FUNCTIONS_KEY
  },
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;
