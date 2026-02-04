/**
 * Unit tests for OrganizationService
 */

import { API_ERROR_CODES } from '@/types';

import { OrganizationService } from '../organization.service';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

// Mock shared browser supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

describe('OrganizationService', () => {
  let service: OrganizationService;

  beforeEach(() => {
    service = new OrganizationService();
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create organization successfully', async () => {
      const mockOrgData = {
        name: 'Test Organization',
        industry: 'Technology',
        contact_email: 'test@example.com',
      };

      const mockOrgId = 'org-123';
      const mockOrganization = {
        id: mockOrgId,
        name: 'Test Organization',
        slug: 'test-organization',
        industry: 'Technology',
        contact_email: 'test@example.com',
        subscription_tier: 'free',
        subscription_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock RPC call for creating organization
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockOrgId,
        error: null,
      });

      // Mock getting the created organization
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrganization,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.createOrganization(mockOrgData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrganization);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_organization_with_owner', {
        org_name: 'Test Organization',
        org_slug: undefined,
        creator_email: 'test@example.com',
      });
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        industry: 'Technology',
      };

      const result = await service.createOrganization(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
      expect(result.error?.details?.errors).toBeDefined();
    });

    it('should handle Supabase errors', async () => {
      const mockOrgData = {
        name: 'Test Organization',
        industry: 'Technology',
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'Duplicate key value' },
      });

      const result = await service.createOrganization(mockOrgData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(API_ERROR_CODES.ORGANIZATION_SLUG_TAKEN);
    });
  });

  describe('getOrganizationById', () => {
    it('should get organization by ID successfully', async () => {
      const mockOrganization = {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-organization',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrganization,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.getOrganizationById('org-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrganization);
    });

    it('should handle not found error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          }),
        }),
      });

      const result = await service.getOrganizationById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(API_ERROR_CODES.RESOURCE_NOT_FOUND);
    });
  });

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      const updateData = {
        name: 'Updated Organization',
        industry: 'Healthcare',
      };

      const mockUpdatedOrg = {
        id: 'org-123',
        name: 'Updated Organization',
        industry: 'Healthcare',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedOrg,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.updateOrganization('org-123', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedOrg);
    });

    it('should validate update data', async () => {
      const invalidData = {
        name: 'A', // Too short
        contact_email: 'invalid-email',
      };

      const result = await service.updateOrganization('org-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe('inviteUser', () => {
    it('should invite user successfully', async () => {
      const inviteData = {
        email: 'user@example.com',
        role: 'member' as const,
      };

      const mockInvitationId = 'invite-123';
      const mockInvitation = {
        id: mockInvitationId,
        organization_id: 'org-123',
        email: 'user@example.com',
        role: 'member',
        token: 'mock-token',
        expires_at: '2024-01-08T00:00:00Z',
      };

      // Mock RPC call for creating invitation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockInvitationId,
        error: null,
      });

      // Mock getting the created invitation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockInvitation,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.inviteUser('org-123', inviteData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitation);
    });

    it('should validate invitation data', async () => {
      const invalidData = {
        email: 'invalid-email',
        role: 'invalid-role' as any,
      };

      const result = await service.inviteUser('org-123', invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe('getOrganizationMembers', () => {
    it('should get paginated members successfully', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          organization_id: 'org-123',
          user_id: 'user-1',
          role: 'owner',
          status: 'active',
          user_profile: {
            id: 'user-1',
            email: 'owner@example.com',
            full_name: 'John Owner',
          },
        },
        {
          id: 'member-2',
          organization_id: 'org-123',
          user_id: 'user-2',
          role: 'member',
          status: 'active',
          user_profile: {
            id: 'user-2',
            email: 'member@example.com',
            full_name: 'Jane Member',
          },
        },
      ];

      // Mock count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        }),
      });

      // Mock data query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockMembers,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getOrganizationMembers('org-123', 1, 20);

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockMembers);
      expect(result.data?.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      });
    });
  });

  describe('removeUser', () => {
    it('should remove user successfully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.removeUser('org-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User removed from organization successfully');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('remove_user_from_organization', {
        org_id: 'org-123',
        target_user_id: 'user-456',
      });
    });

    it('should handle permission errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: '42501', message: 'Insufficient permissions' },
      });

      const result = await service.removeUser('org-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(API_ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe('switchOrganization', () => {
    it('should switch organization successfully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.switchOrganization('org-456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Organization switched successfully');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('switch_user_organization', {
        target_org_id: 'org-456',
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockMembershipId = 'member-123';
      const mockMembership = {
        id: mockMembershipId,
        organization_id: 'org-123',
        user_id: 'user-456',
        role: 'member',
        status: 'active',
      };

      // Mock RPC call for accepting invitation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockMembershipId,
        error: null,
      });

      // Mock getting the created membership
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMembership,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.acceptInvitation({ token: 'valid-token' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMembership);
    });
  });
});
