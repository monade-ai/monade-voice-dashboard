'use client';
import React, { useState, useEffect, useRef } from 'react';

import { OrganizationRole, UpdateOrganizationData, InviteUserData } from '@/types/organization';

const TABS = ['Profile', 'Users', 'Billing', 'Danger Zone'] as const;
type Tab = typeof TABS[number];

export default function OrgSettingsPage() {
  // TODO: Replace with new Supabase-based user, organization, and permission context
  const user = null; // Placeholder
  const organization = null; // Placeholder
  const orgLoading = false; // Placeholder
  const updateOrganization = async (data: UpdateOrganizationData) => { console.warn('Organization update not implemented.'); }; // Placeholder
  const deleteOrganization = async () => { console.warn('Organization deletion not implemented.'); }; // Placeholder
  
  const members = []; // Placeholder
  const membersLoading = false; // Placeholder
  const inviteUser = async (data: InviteUserData) => { console.warn('User invite not implemented.'); }; // Placeholder
  const removeUser = async (userId: string) => { console.warn('User removal not implemented.'); }; // Placeholder
  const updateUserRole = async (data: { userId: string; newRole: OrganizationRole; }) => { console.warn('User role update not implemented.'); }; // Placeholder

  const canEditOrg = true; // Placeholder
  const canManageUsers = true; // Placeholder
  const canViewBilling = true; // Placeholder
  const canDeleteOrg = true; // Placeholder
  
  const [tab, setTab] = useState<Tab>('Profile');
  const [saving, setSaving] = useState(false);
  
  // Organization profile state
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Users management state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Danger zone state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load organization data
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setIndustry(organization.industry || '');
      setContactEmail(organization.contact_email || '');
      setBillingEmail(organization.billing_email || '');
      setLogoUrl(organization.logo_url || null);
    }
  }, [organization]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !canEditOrg) return;
    
    setSaving(true);
    try {
      const updateData: UpdateOrganizationData = {
        name: orgName.trim(),
        industry: industry.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        billing_email: billingEmail.trim() || undefined,
      };

      // TODO: Handle logo upload to storage service
      if (logo) {
        // This would upload to your storage service and get the URL
        // updateData.logo_url = uploadedLogoUrl;
      }

      await updateOrganization(updateData);
      // Organization profile updated successfully
    } catch (error) {
      console.error('Error updating organization:', error);
      // Failed to update organization profile
    } finally {
      setSaving(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      const inviteData: InviteUserData = {
        email: inviteEmail.trim(),
        role: inviteRole,
      };

      await inviteUser(inviteData);
      // Invitation sent to ${inviteEmail}
      setInviteEmail('');
      setInviteRole('member');
      setInviteDialogOpen(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      // Failed to send invitation
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    try {
      await removeUser(userId);
      // ${userName} has been removed from the organization
    } catch (error) {
      console.error('Error removing user:', error);
      // Failed to remove user
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: OrganizationRole, userName: string) => {
    try {
      await updateUserRole({ userId, newRole });
      // ${userName}'s role has been updated to ${newRole}
    } catch (error) {
      console.error('Error updating user role:', error);
      // Failed to update user role
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization || !canDeleteOrg) return;
    if (deleteConfirmation !== organization.name) {
      // Please type the organization name exactly to confirm deletion
      return;
    }
    
    try {
      await deleteOrganization();
      // Organization deleted successfully
      // Redirect to dashboard or sign out
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error deleting organization:', error);
      // Failed to delete organization
    }
  };

}
