/**
 * React hooks for organization management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Organization, 
  OrganizationMember, 
  InvitationToken,
  CreateOrganizationData,
  UpdateOrganizationData,
  InviteUserData,
  AcceptInvitationData,
  OrganizationRole,
  PaginatedResponse,
  AsyncState,
  createAsyncState
} from '@/types';
import { getOrganizationService } from '@/lib/services';

/**
 * Hook for managing organization CRUD operations
 */
export function useOrganization(organizationId?: string) {
  const [organization, setOrganization] = useState<AsyncState<Organization>>(
    createAsyncState()
  );
  const organizationService = getOrganizationService();

  const loadOrganization = useCallback(async (id: string) => {
    setOrganization(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.getOrganizationById(id);
      
      if (response.success && response.data) {
        setOrganization({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });
      } else {
        setOrganization({
          data: null,
          loading: false,
          error: response.error?.message || 'Failed to load organization',
          success: false
        });
      }
    } catch (error) {
      setOrganization({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [organizationService]);

  const createOrganization = useCallback(async (data: CreateOrganizationData) => {
    setOrganization(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.createOrganization(data);
      
      if (response.success && response.data) {
        setOrganization({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });
        return response.data;
      } else {
        setOrganization(prev => ({
          ...prev,
          loading: false,
          error: response.error?.message || 'Failed to create organization',
          success: false
        }));
        throw new Error(response.error?.message || 'Failed to create organization');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setOrganization(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        success: false
      }));
      throw error;
    }
  }, [organizationService]);

  const updateOrganization = useCallback(async (id: string, data: UpdateOrganizationData) => {
    setOrganization(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.updateOrganization(id, data);
      
      if (response.success && response.data) {
        setOrganization({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });
        return response.data;
      } else {
        setOrganization(prev => ({
          ...prev,
          loading: false,
          error: response.error?.message || 'Failed to update organization',
          success: false
        }));
        throw new Error(response.error?.message || 'Failed to update organization');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setOrganization(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        success: false
      }));
      throw error;
    }
  }, [organizationService]);

  const deleteOrganization = useCallback(async (id: string) => {
    setOrganization(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.deleteOrganization(id);
      
      if (response.success) {
        setOrganization({
          data: null,
          loading: false,
          error: null,
          success: true
        });
      } else {
        setOrganization(prev => ({
          ...prev,
          loading: false,
          error: response.error?.message || 'Failed to delete organization',
          success: false
        }));
        throw new Error(response.error?.message || 'Failed to delete organization');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setOrganization(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        success: false
      }));
      throw error;
    }
  }, [organizationService]);

  // Load organization on mount if ID is provided
  useEffect(() => {
    if (organizationId) {
      loadOrganization(organizationId);
    }
  }, [organizationId, loadOrganization]);

  return {
    organization: organization.data,
    loading: organization.loading,
    error: organization.error,
    success: organization.success,
    loadOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refetch: organizationId ? () => loadOrganization(organizationId) : undefined
  };
}

/**
 * Hook for managing organization members
 */
export function useOrganizationMembers(organizationId: string) {
  const [members, setMembers] = useState<AsyncState<PaginatedResponse<OrganizationMember>>>(
    createAsyncState()
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const organizationService = getOrganizationService();

  const loadMembers = useCallback(async (pageNum: number = page) => {
    if (!organizationId) return;
    
    setMembers(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.getOrganizationMembers(
        organizationId, 
        pageNum, 
        limit
      );
      
      if (response.success && response.data) {
        setMembers({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });
      } else {
        setMembers({
          data: null,
          loading: false,
          error: response.error?.message || 'Failed to load members',
          success: false
        });
      }
    } catch (error) {
      setMembers({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [organizationId, page, limit, organizationService]);

  const inviteUser = useCallback(async (data: InviteUserData) => {
    try {
      const response = await organizationService.inviteUser(organizationId, data);
      
      if (response.success) {
        // Refresh members list
        await loadMembers();
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to invite user');
      }
    } catch (error) {
      throw error;
    }
  }, [organizationId, organizationService, loadMembers]);

  const removeUser = useCallback(async (userId: string) => {
    try {
      const response = await organizationService.removeUser(organizationId, userId);
      
      if (response.success) {
        // Refresh members list
        await loadMembers();
      } else {
        throw new Error(response.error?.message || 'Failed to remove user');
      }
    } catch (error) {
      throw error;
    }
  }, [organizationId, organizationService, loadMembers]);

  const updateUserRole = useCallback(async (userId: string, newRole: OrganizationRole) => {
    try {
      const response = await organizationService.updateUserRole(organizationId, userId, newRole);
      
      if (response.success) {
        // Refresh members list
        await loadMembers();
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to update user role');
      }
    } catch (error) {
      throw error;
    }
  }, [organizationId, organizationService, loadMembers]);

  const nextPage = useCallback(() => {
    if (members.data?.pagination.has_next) {
      const newPage = page + 1;
      setPage(newPage);
      loadMembers(newPage);
    }
  }, [members.data?.pagination.has_next, page, loadMembers]);

  const prevPage = useCallback(() => {
    if (members.data?.pagination.has_prev) {
      const newPage = page - 1;
      setPage(newPage);
      loadMembers(newPage);
    }
  }, [members.data?.pagination.has_prev, page, loadMembers]);

  const goToPage = useCallback((pageNum: number) => {
    setPage(pageNum);
    loadMembers(pageNum);
  }, [loadMembers]);

  // Load members on mount
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    members: members.data?.data || [],
    pagination: members.data?.pagination,
    loading: members.loading,
    error: members.error,
    success: members.success,
    inviteUser,
    removeUser,
    updateUserRole,
    refetch: () => loadMembers(),
    nextPage,
    prevPage,
    goToPage,
    currentPage: page
  };
}

/**
 * Hook for managing organization invitations
 */
export function useOrganizationInvitations(organizationId: string) {
  const [invitations, setInvitations] = useState<AsyncState<InvitationToken[]>>(
    createAsyncState()
  );
  const organizationService = getOrganizationService();

  const loadInvitations = useCallback(async () => {
    if (!organizationId) return;
    
    setInvitations(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.getOrganizationInvitations(organizationId);
      
      if (response.success && response.data) {
        setInvitations({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });
      } else {
        setInvitations({
          data: null,
          loading: false,
          error: response.error?.message || 'Failed to load invitations',
          success: false
        });
      }
    } catch (error) {
      setInvitations({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  }, [organizationId, organizationService]);

  const resendInvitation = useCallback(async (invitationId: string) => {
    try {
      const response = await organizationService.resendInvitation(invitationId);
      
      if (response.success) {
        // Refresh invitations list
        await loadInvitations();
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to resend invitation');
      }
    } catch (error) {
      throw error;
    }
  }, [organizationService, loadInvitations]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    try {
      const response = await organizationService.cancelInvitation(invitationId);
      
      if (response.success) {
        // Refresh invitations list
        await loadInvitations();
      } else {
        throw new Error(response.error?.message || 'Failed to cancel invitation');
      }
    } catch (error) {
      throw error;
    }
  }, [organizationService, loadInvitations]);

  // Load invitations on mount
  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  return {
    invitations: invitations.data || [],
    loading: invitations.loading,
    error: invitations.error,
    success: invitations.success,
    resendInvitation,
    cancelInvitation,
    refetch: loadInvitations
  };
}

/**
 * Hook for accepting organization invitations
 */
export function useInvitationAcceptance() {
  const [state, setState] = useState<AsyncState<OrganizationMember>>(
    createAsyncState()
  );
  const organizationService = getOrganizationService();

  const acceptInvitation = useCallback(async (data: AcceptInvitationData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await organizationService.acceptInvitation(data);
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          success: true
        });
        return response.data;
      } else {
        setState({
          data: null,
          loading: false,
          error: response.error?.message || 'Failed to accept invitation',
          success: false
        });
        throw new Error(response.error?.message || 'Failed to accept invitation');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
        success: false
      });
      throw error;
    }
  }, [organizationService]);

  return {
    membership: state.data,
    loading: state.loading,
    error: state.error,
    success: state.success,
    acceptInvitation
  };
}

/**
 * Hook for organization switching
 */
export function useOrganizationSwitching() {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const organizationService = getOrganizationService();

  const switchOrganization = useCallback(async (organizationId: string) => {
    setSwitching(true);
    setError(null);
    
    try {
      const response = await organizationService.switchOrganization(organizationId);
      
      if (response.success) {
        // Organization switched successfully
        // The auth context should be updated by the parent component
      } else {
        setError(response.error?.message || 'Failed to switch organization');
        throw new Error(response.error?.message || 'Failed to switch organization');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    } finally {
      setSwitching(false);
    }
  }, [organizationService]);

  return {
    switching,
    error,
    switchOrganization
  };
}