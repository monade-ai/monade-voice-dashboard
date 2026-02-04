/**
 * Organization Service - Handles all organization-related operations
 */

import { createClient } from '@/utils/supabase/client';
import {
  Organization,
  OrganizationMember,
  InvitationToken,
  CreateOrganizationData,
  UpdateOrganizationData,
  InviteUserData,
  AcceptInvitationData,
  OrganizationRole,
  ApiResponse,
  API_ERROR_CODES,
  PaginatedResponse,
  validateCreateOrganizationData,
  validateUpdateOrganizationData,
  validateInviteUserData,
  sanitizeOrganizationName,
  sanitizeSlug,
  sanitizeEmail,
} from '@/types';

export class OrganizationService {
  private supabase = createClient();

  /**
   * Create a new organization with the current user as owner
   */
  async createOrganization(data: CreateOrganizationData): Promise<ApiResponse<Organization>> {
    try {
      // Validate input data
      const validation = validateCreateOrganizationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid organization data',
            details: { errors: validation.errors },
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Sanitize input
      const sanitizedData = {
        name: sanitizeOrganizationName(data.name),
        slug: data.slug ? sanitizeSlug(data.slug) : undefined,
        industry: data.industry?.trim(),
        contact_email: data.contact_email ? sanitizeEmail(data.contact_email) : undefined,
      };

      // Generate slug if not provided
      if (!sanitizedData.slug) {
        sanitizedData.slug = await this.generateUniqueSlug(sanitizedData.name);
      }

      // Call database function to create organization with owner
      const { data: result, error } = await this.supabase
        .rpc('create_organization_with_owner', {
          org_name: sanitizedData.name,
          org_slug: sanitizedData.slug,
          creator_email: sanitizedData.contact_email,
        });

      if (error) {
        return this.handleSupabaseError(error);
      }

      // Fetch the created organization
      const organization = await this.getOrganizationById(result);

      return organization;

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: data as Organization,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<ApiResponse<Organization>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: data as Organization,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(id: string, data: UpdateOrganizationData): Promise<ApiResponse<Organization>> {
    try {
      // Validate input data
      const validation = validateUpdateOrganizationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid organization data',
            details: { errors: validation.errors },
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Sanitize input
      const sanitizedData: Partial<Organization> = {};
      if (data.name) sanitizedData.name = sanitizeOrganizationName(data.name);
      if (data.logo_url) sanitizedData.logo_url = data.logo_url.trim();
      if (data.industry) sanitizedData.industry = data.industry.trim();
      if (data.contact_email) sanitizedData.contact_email = sanitizeEmail(data.contact_email);
      if (data.billing_email) sanitizedData.billing_email = sanitizeEmail(data.billing_email);

      const { data: result, error } = await this.supabase
        .from('organizations')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: result as Organization,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Delete organization (only owners can do this)
   */
  async deleteOrganization(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        message: 'Organization deleted successfully',
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(): Promise<ApiResponse<Organization[]>> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*');

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: data as Organization[],
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Switch user's current organization
   */
  async switchOrganization(organizationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .rpc('switch_user_organization', {
          target_org_id: organizationId,
        });

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        message: 'Organization switched successfully',
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Get organization members with pagination
   */
  async getOrganizationMembers(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ApiResponse<PaginatedResponse<OrganizationMember>>> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await this.supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (countError) {
        return this.handleSupabaseError(countError);
      }

      // Get paginated data with user profiles
      const { data, error } = await this.supabase
        .from('organization_members')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return this.handleSupabaseError(error);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          data: data as OrganizationMember[],
          pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1,
          },
        },
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Invite user to organization
   */
  async inviteUser(organizationId: string, data: InviteUserData): Promise<ApiResponse<InvitationToken>> {
    try {
      // Validate input data
      const validation = validateInviteUserData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid invitation data',
            details: { errors: validation.errors },
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Generate secure invitation token
      const token = this.generateInvitationToken();

      // Call database function to create invitation
      const { data: result, error } = await this.supabase
        .rpc('invite_user_to_organization', {
          org_id: organizationId,
          invite_email: sanitizeEmail(data.email),
          invite_role: data.role,
          invitation_token: token,
        });

      if (error) {
        return this.handleSupabaseError(error);
      }

      // Get the created invitation
      const { data: invitation, error: inviteError } = await this.supabase
        .from('invitation_tokens')
        .select('*')
        .eq('id', result)
        .single();

      if (inviteError) {
        return this.handleSupabaseError(inviteError);
      }

      return {
        success: true,
        data: invitation as InvitationToken,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Accept organization invitation
   */
  async acceptInvitation(data: AcceptInvitationData): Promise<ApiResponse<OrganizationMember>> {
    try {
      const { data: result, error } = await this.supabase
        .rpc('accept_organization_invitation', {
          invitation_token: data.token,
        });

      if (error) {
        return this.handleSupabaseError(error);
      }

      // Get the created membership
      const { data: membership, error: memberError } = await this.supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations(*),
          user_profile:user_profiles(*)
        `)
        .eq('id', result)
        .single();

      if (memberError) {
        return this.handleSupabaseError(memberError);
      }

      return {
        success: true,
        data: membership as OrganizationMember,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Remove user from organization
   */
  async removeUser(organizationId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .rpc('remove_user_from_organization', {
          org_id: organizationId,
          target_user_id: userId,
        });

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        message: 'User removed from organization successfully',
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Update user role in organization
   */
  async updateUserRole(
    organizationId: string, 
    userId: string, 
    newRole: OrganizationRole,
  ): Promise<ApiResponse<OrganizationMember>> {
    try {
      const { data, error } = await this.supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .single();

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: data as OrganizationMember,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Get organization invitations
   */
  async getOrganizationInvitations(organizationId: string): Promise<ApiResponse<InvitationToken[]>> {
    try {
      const { data, error } = await this.supabase
        .from('invitation_tokens')
        .select(`
          *,
          inviter:user_profiles!invited_by(*)
        `)
        .eq('organization_id', organizationId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: data as InvitationToken[],
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string): Promise<ApiResponse<InvitationToken>> {
    try {
      // Generate new token and extend expiry
      const newToken = this.generateInvitationToken();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7); // 7 days from now

      const { data, error } = await this.supabase
        .from('invitation_tokens')
        .update({
          token: newToken,
          expires_at: newExpiry.toISOString(),
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        data: data as InvitationToken,
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.supabase
        .from('invitation_tokens')
        .delete()
        .eq('id', invitationId);

      if (error) {
        return this.handleSupabaseError(error);
      }

      return {
        success: true,
        message: 'Invitation cancelled successfully',
      };

    } catch (error) {
      return this.handleUnexpectedError(error);
    }
  }

  // Private helper methods

  private async generateUniqueSlug(name: string): Promise<string> {
    const { data, error } = await this.supabase
      .rpc('generate_organization_slug', { org_name: name });

    if (error) {
      throw error;
    }

    return data;
  }

  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'organization';
  }

  private generateInvitationToken(): string {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private handleSupabaseError(error: any): ApiResponse<never> {
    console.error('[OrganizationService] Supabase error:', error);

    // Map common Supabase errors to our error codes
    let errorCode = API_ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = error.message || 'An unexpected error occurred';

    if (error.code === 'PGRST116') {
      errorCode = API_ERROR_CODES.RESOURCE_NOT_FOUND;
      message = 'Resource not found';
    } else if (error.code === '23505') {
      errorCode = API_ERROR_CODES.ORGANIZATION_SLUG_TAKEN;
      message = 'Organization slug is already taken';
    } else if (error.code === '42501') {
      errorCode = API_ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      message = 'Insufficient permissions';
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message,
        details: { supabaseError: error },
        timestamp: new Date().toISOString(),
      },
    };
  }

  private handleUnexpectedError(error: any): ApiResponse<never> {
    console.error('[OrganizationService] Unexpected error:', error);

    return {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        details: { originalError: error.message },
        timestamp: new Date().toISOString(),
      },
    };
  }
}
