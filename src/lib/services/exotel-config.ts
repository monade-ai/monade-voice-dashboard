export const EXOTEL_CONFIG = {
  API_URL: process.env.EXOTEL_API_URL || '',
  API_KEY: process.env.EXOTEL_API_KEY || '',
  FUNCTIONS_KEY: process.env.EXOTEL_FUNCTIONS_KEY || '',
} as const;