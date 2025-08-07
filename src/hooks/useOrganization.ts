'use client';
/**
 * React hooks for organization management
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  createAsyncState,
} from '@/types';
import { getOrganizationService } from '@/lib/services';

import { useCurrentSession } from './useCurrentSession';

const organizationService = getOrganizationService();

export function useOrganization() {
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useCurrentSession();

  const { data: organization, isLoading: isOrganizationLoading } = useQuery({
    queryKey: ['organization', session?.organization?.id],
    queryFn: () => {
      if (!session?.organization?.id) return null;

      return organizationService.getOrganizationById(session.organization.id);
    },
    enabled: !!session?.organization?.id,
  });

  const createOrganizationMutation = useMutation({
    mutationFn: (data: CreateOrganizationData) => organizationService.createOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-session'] });
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: (data: UpdateOrganizationData) => {
      if (!session?.organization?.id) throw new Error('No organization selected');

      return organizationService.updateOrganization(session.organization.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', session?.organization?.id] });
    },
  });

  const deleteOrganizationMutation = useMutation({
    mutationFn: () => {
      if (!session?.organization?.id) throw new Error('No organization selected');

      return organizationService.deleteOrganization(session.organization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-session'] });
    },
  });

  return {
    organization: organization?.data,
    loading: isSessionLoading || isOrganizationLoading,
    createOrganization: createOrganizationMutation.mutateAsync,
    updateOrganization: updateOrganizationMutation.mutateAsync,
    deleteOrganization: deleteOrganizationMutation.mutateAsync,
  };
}

export function useOrganizationMembers() {
  const queryClient = useQueryClient();
  const { data: session } = useCurrentSession();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', session?.organization?.id],
    queryFn: () => {
      if (!session?.organization?.id) return null;

      return organizationService.getOrganizationMembers(session.organization.id);
    },
    enabled: !!session?.organization?.id,
  });

  const inviteUserMutation = useMutation({
    mutationFn: (data: InviteUserData) => {
      if (!session?.organization?.id) throw new Error('No organization selected');

      return organizationService.inviteUser(session.organization.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', session?.organization?.id] });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!session?.organization?.id) throw new Error('No organization selected');

      return organizationService.removeUser(session.organization.id, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', session?.organization?.id] });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: OrganizationRole }) => {
      if (!session?.organization?.id) throw new Error('No organization selected');

      return organizationService.updateUserRole(session.organization.id, userId, newRole);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', session?.organization?.id] });
    },
  });

  return {
    members: members?.data?.data || [],
    pagination: members?.data?.pagination,
    loading: isLoading,
    inviteUser: inviteUserMutation.mutateAsync,
    removeUser: removeUserMutation.mutateAsync,
    updateUserRole: updateUserRoleMutation.mutateAsync,
  };
}

export function useOrganizationInvitations() {
  const queryClient = useQueryClient();
  const { data: session } = useCurrentSession();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['organization-invitations', session?.organization?.id],
    queryFn: () => {
      if (!session?.organization?.id) return null;

      return organizationService.getOrganizationInvitations(session.organization.id);
    },
    enabled: !!session?.organization?.id,
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => organizationService.resendInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', session?.organization?.id] });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => organizationService.cancelInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', session?.organization?.id] });
    },
  });

  return {
    invitations: invitations?.data || [],
    loading: isLoading,
    resendInvitation: resendInvitationMutation.mutateAsync,
    cancelInvitation: cancelInvitationMutation.mutateAsync,
  };
}

export function useInvitationAcceptance() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: AcceptInvitationData) => organizationService.acceptInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-session'] });
    },
  });

  return {
    acceptInvitation: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
    success: mutation.isSuccess,
  };
}

export function useOrganizationSwitching() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (organizationId: string) => organizationService.switchOrganization(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-session'] });
    },
  });

  return {
    switchOrganization: mutation.mutateAsync,
    switching: mutation.isPending,
    error: mutation.error,
  };
}
