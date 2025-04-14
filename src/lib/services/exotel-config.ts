if (!process.env.EXOTEL_API_URL) {
  throw new Error('EXOTEL_API_URL environment variable is not set');
}

if (!process.env.EXOTEL_API_KEY) {
  throw new Error('EXOTEL_API_KEY environment variable is not set');
}

if (!process.env.EXOTEL_FUNCTIONS_KEY) {
  throw new Error('EXOTEL_FUNCTIONS_KEY environment variable is not set');
}

export const EXOTEL_CONFIG = {
  API_URL: process.env.EXOTEL_API_URL,
  API_KEY: process.env.EXOTEL_API_KEY,
  FUNCTIONS_KEY: process.env.EXOTEL_FUNCTIONS_KEY
} as const;