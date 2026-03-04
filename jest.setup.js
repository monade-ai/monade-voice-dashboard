import '@testing-library/jest-dom'

// Mock ESM-only shader library used by PaperCard (Jest doesn't transpile node_modules ESM by default).
jest.mock('@paper-design/shaders-react', () => ({
  StaticMeshGradient: () => null,
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Better Auth client modules (ESM-only in node_modules).
jest.mock('@better-auth/api-key/client', () => ({
  apiKeyClient: jest.fn(() => ({})),
}))

jest.mock('better-auth/react', () => ({
  createAuthClient: jest.fn(() => ({
    useSession: jest.fn(() => ({ data: null, isPending: false })),
    signIn: {
      email: jest.fn(async () => ({ data: null, error: null })),
    },
    signUp: {
      email: jest.fn(async () => ({ data: null, error: null })),
    },
    signOut: jest.fn(async () => ({ data: null, error: null })),
  })),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_CONFIG_SERVER_URL = 'https://service.monade.ai/db_services'
process.env.MONADE_API_BASE_URL = 'https://service.monade.ai/db_services'
process.env.SERVICE_API_KEY = 'test-service-token'
process.env.EXOTEL_API_KEY = 'test-api-key'
process.env.EXOTEL_FUNCTIONS_KEY = 'test-functions-key'
process.env.EXOTEL_API_URL = 'https://test-exotel-api.com/api/call'
// Campaign API test environment variables
process.env.EXOTEL_ACCOUNT_SID = 'test-account-sid'
process.env.EXOTEL_BASE_URL = 'api.exotel.com'

// Mock fetch globally
global.fetch = jest.fn()

if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))
