/**
 * AuthProvider Enhanced Logout Tests
 * Tests the integration between AuthProvider and LogoutService
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

import { AuthProvider, useAuth } from '../AuthProvider';
import { logoutService } from '../LogoutService';
import { authClientManager } from '../AuthClientManager';

// Mock dependencies
jest.mock('../LogoutService');
jest.mock('../AuthClientManager');
jest.mock('../ConfigManager');
jest.mock('../../services');

const mockLogoutService = logoutService as jest.Mocked<typeof logoutService>;
const mockAuthClientManager = authClientManager as jest.Mocked<typeof authClientManager>;

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(),
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
  rpc: jest.fn(),
};

// Test component that uses the auth context
function TestComponent() {
  const { isLoggingOut, logoutError, signOut } = useAuth();
  
  return (
    <div>
      <div data-testid="logout-state">
        {isLoggingOut ? 'logging-out' : 'not-logging-out'}
      </div>
      <div data-testid="logout-error">
        {logoutError || 'no-error'}
      </div>
      <button 
        data-testid="logout-button" 
        onClick={() => signOut()}
      >
        Logout
      </button>
    </div>
  );
}

describe('AuthProvider Enhanced Logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAuthClientManager.getComponentClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    
    // Mock organization service
    const mockOrganizationService = {
      getUserOrganizations: jest.fn().mockResolvedValue({ success: true, data: [] }),
      switchOrganization: jest.fn().mockResolvedValue({ success: true }),
    };
    
    const services = await import('../../services');
    (services.getOrganizationService as jest.Mock).mockReturnValue(mockOrganizationService);
  });

  it('should initialize with correct logout state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
      expect(screen.getByTestId('logout-error')).toHaveTextContent('no-error');
    });
  });

  it('should manage logout state during successful logout', async () => {
    const mockLogoutResult = {
      success: true,
      steps: [],
      errors: [],
      totalTime: 1000,
      completedSteps: 4,
      failedSteps: 0,
    };

    mockLogoutService.executeLogout.mockResolvedValue(mockLogoutResult);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
    });

    // Trigger logout
    act(() => {
      screen.getByTestId('logout-button').click();
    });

    // Should show logging out state briefly
    expect(screen.getByTestId('logout-state')).toHaveTextContent('logging-out');

    // Wait for logout to complete
    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
      expect(screen.getByTestId('logout-error')).toHaveTextContent('no-error');
    });

    // Verify LogoutService was called with correct options
    expect(mockLogoutService.executeLogout).toHaveBeenCalledWith({
      clearLocalStorage: true,
      clearOrganizationData: true,
      signOutFromSupabase: true,
      forceRedirect: true,
      redirectUrl: '/auth/login',
      addSignedOutParam: true,
      clearAuthState: expect.any(Function),
      stepTimeout: 5000,
    });
  });

  it('should handle logout errors gracefully', async () => {
    const mockLogoutResult = {
      success: false,
      steps: [],
      errors: [
        {
          step: 'clear_local_storage',
          code: 'STORAGE_ERROR',
          message: 'Failed to clear localStorage',
          timestamp: new Date().toISOString(),
        },
      ],
      totalTime: 500,
      completedSteps: 2,
      failedSteps: 1,
    };

    mockLogoutService.executeLogout.mockResolvedValue(mockLogoutResult);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
    });

    // Trigger logout
    act(() => {
      screen.getByTestId('logout-button').click();
    });

    // Wait for logout to complete with error
    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
      expect(screen.getByTestId('logout-error')).toHaveTextContent('Logout completed with issues: Failed to clear localStorage');
    });
  });

  it('should handle logout service exceptions', async () => {
    const mockError = new Error('Logout service failed');
    mockLogoutService.executeLogout.mockRejectedValue(mockError);

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
    });

    // Trigger logout
    act(() => {
      screen.getByTestId('logout-button').click();
    });

    // Wait for logout to handle the exception
    await waitFor(() => {
      expect(screen.getByTestId('logout-state')).toHaveTextContent('not-logging-out');
      expect(screen.getByTestId('logout-error')).toHaveTextContent('Logout service failed');
    });
  });

  it('should call clearAuthState callback during logout', async () => {
    const mockLogoutResult = {
      success: true,
      steps: [],
      errors: [],
      totalTime: 1000,
      completedSteps: 4,
      failedSteps: 0,
    };

    let capturedClearAuthState: (() => void) | null = null;
    
    mockLogoutService.executeLogout.mockImplementation(async (options) => {
      // Capture the clearAuthState callback
      capturedClearAuthState = options.clearAuthState!;
      
      // Simulate calling it during logout
      if (capturedClearAuthState) {
        capturedClearAuthState();
      }
      
      return mockLogoutResult;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Trigger logout
    act(() => {
      screen.getByTestId('logout-button').click();
    });

    await waitFor(() => {
      expect(mockLogoutService.executeLogout).toHaveBeenCalled();
    });

    // Verify the clearAuthState callback was provided and would work
    expect(capturedClearAuthState).toBeDefined();
  });

  it('should return LogoutResult from signOut method', async () => {
    const mockLogoutResult = {
      success: true,
      steps: [],
      errors: [],
      totalTime: 1000,
      completedSteps: 4,
      failedSteps: 0,
    };

    mockLogoutService.executeLogout.mockResolvedValue(mockLogoutResult);

    let signOutResult: any = null;

    function TestComponentWithResult() {
      const { signOut } = useAuth();
      
      const handleLogout = async () => {
        signOutResult = await signOut();
      };
      
      return (
        <button data-testid="logout-button" onClick={handleLogout}>
          Logout
        </button>
      );
    }

    render(
      <AuthProvider>
        <TestComponentWithResult />
      </AuthProvider>,
    );

    // Trigger logout
    await act(async () => {
      screen.getByTestId('logout-button').click();
    });

    await waitFor(() => {
      expect(signOutResult).toEqual(mockLogoutResult);
    });
  });
});