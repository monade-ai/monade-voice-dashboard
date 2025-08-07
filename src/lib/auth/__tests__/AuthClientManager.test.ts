/**
 * Tests for AuthClientManager
 */

import { AuthClientManager, authClientManager } from '../AuthClientManager';
import { configManager } from '../ConfigManager';

// Mock the Supabase auth helpers
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
  })),
  createServerComponentClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
    },
  })),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(),
    },
  })),
}));

// Mock the ConfigManager
jest.mock('../ConfigManager', () => ({
  configManager: {
    getSupabaseConfig: jest.fn(),
    validateConfig: jest.fn(),
    resolveConflicts: jest.fn(),
  },
}));

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

Object.defineProperty(window, 'Object', {
  value: {
    ...Object,
    keys: jest.fn(),
  },
});

describe('AuthClientManager', () => {
  let manager: AuthClientManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock valid configuration
    (configManager.getSupabaseConfig as jest.Mock).mockReturnValue({
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      source: 'env.local',
      isValid: true,
    });

    (configManager.validateConfig as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      config: {
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
        source: 'env.local',
        isValid: true,
      },
    });

    manager = AuthClientManager.getInstance();
    manager.reset(); // Reset for clean state
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AuthClientManager.getInstance();
      const instance2 = AuthClientManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      expect(authClientManager).toBeInstanceOf(AuthClientManager);
    });
  });

  describe('Client Creation', () => {
    it('should create component client successfully', () => {
      const client = manager.getComponentClient();

      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it('should validate configuration before creating client', () => {
      manager.getComponentClient();

      expect(configManager.validateConfig).toHaveBeenCalled();
    });

    it('should throw error for invalid configuration', () => {
      (configManager.validateConfig as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid URL'],
        warnings: [],
        config: { isValid: false },
      });

      expect(() => manager.getComponentClient()).toThrow('Invalid Supabase configuration');
    });
  });

  describe('Session Cleanup', () => {
    beforeEach(() => {
      // Mock Object.keys for localStorage
      (Object.keys as jest.Mock) = jest.fn().mockReturnValue([
        'access_token',
        'sb-test-auth-token',
        'org_123_draftAssistants',
        'contacts_456',
        'other_key',
      ]);
    });

    it('should perform complete session cleanup', async () => {
      const mockClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      await manager.cleanupSession();

      expect(mockClient.auth.signOut).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockSessionStorage.clear).toHaveBeenCalled();
    });

    it('should continue cleanup even if Supabase signOut fails', async () => {
      const mockClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: new Error('Network error') }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      await expect(manager.cleanupSession()).resolves.not.toThrow();
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });

    it('should clear organization-scoped data when requested', async () => {
      const mockClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      await manager.cleanupSession({ organizationScoped: true });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('org_123_draftAssistants');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('contacts_456');
    });

    it('should skip organization-scoped cleanup when disabled', async () => {
      const mockClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      await manager.cleanupSession({ organizationScoped: false });

      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('org_123_draftAssistants');
    });

    it('should fallback to localStorage.clear() on error', async () => {
      const mockClient = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await manager.cleanupSession();

      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Authentication Status', () => {
    it('should return true for authenticated user', async () => {
      const mockClient = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null,
          }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      const isAuth = await manager.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it('should return false for unauthenticated user', async () => {
      const mockClient = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      const isAuth = await manager.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it('should return false on session error', async () => {
      const mockClient = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: new Error('Session error'),
          }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      const isAuth = await manager.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should get current session successfully', async () => {
      const mockSession = { user: { id: 'test-user' }, access_token: 'token' };
      const mockClient = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      const session = await manager.getCurrentSession();
      expect(session).toEqual(mockSession);
    });

    it('should refresh session successfully', async () => {
      const mockSession = { user: { id: 'test-user' }, access_token: 'new-token' };
      const mockClient = {
        auth: {
          refreshSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      const session = await manager.refreshSession();
      expect(session).toEqual(mockSession);
    });

    it('should throw error on refresh failure', async () => {
      const mockClient = {
        auth: {
          refreshSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: new Error('Refresh failed'),
          }),
        },
      };

      jest.spyOn(manager, 'getComponentClient').mockReturnValue(mockClient as any);

      await expect(manager.refreshSession()).rejects.toThrow('Refresh failed');
    });
  });

  describe('Configuration Info', () => {
    it('should return configuration information', () => {
      const info = manager.getConfigInfo();

      expect(info).toHaveProperty('config');
      expect(info).toHaveProperty('hasComponentClient');
      expect(info).toHaveProperty('hasAdminClient');
      expect(info).toHaveProperty('validation');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset client manager state', () => {
      // Create a client first
      manager.getComponentClient();

      const infoBefore = manager.getConfigInfo();
      expect(infoBefore.hasComponentClient).toBe(true);

      manager.reset();

      const infoAfter = manager.getConfigInfo();
      expect(infoAfter.hasComponentClient).toBe(false);
    });
  });
});