'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useHasPermission } from '@/lib/auth/useHasPermission';
import { getOrganizationService } from '@/lib/services';
import { Organization, OrganizationMember, UpdateOrganizationData, InviteUserData, OrganizationRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, UserPlus, Crown, Shield, User, Mail, Calendar, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TABS = ['Profile', 'Users', 'Billing', 'Danger Zone'] as const;
type Tab = typeof TABS[number];

export default function OrgSettingsPage() {
  const { user, currentOrganization, refreshUserData } = useAuth();
  const canEditOrg = useHasPermission('org.edit');
  const canManageUsers = useHasPermission('users.invite');
  const canViewBilling = useHasPermission('org.billing');
  const canDeleteOrg = useHasPermission('org.delete');
  
  const [tab, setTab] = useState<Tab>('Profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Organization profile state
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Users management state
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Danger zone state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const organizationService = getOrganizationService();

  // Load organization data
  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setIndustry(currentOrganization.industry || '');
      setContactEmail(currentOrganization.contact_email || '');
      setBillingEmail(currentOrganization.billing_email || '');
      setLogoUrl(currentOrganization.logo_url || null);
    }
  }, [currentOrganization]);

  // Load organization members
  useEffect(() => {
    if (currentOrganization && canManageUsers) {
      loadMembers();
    }
  }, [currentOrganization, canManageUsers]);

  const loadMembers = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const response = await organizationService.getOrganizationMembers(currentOrganization.id);
      if (response.success && response.data) {
        setMembers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  // Logo preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo file must be less than 2MB');
        return;
      }
      setLogo(file);
      setLogoUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization || !canEditOrg) return;
    
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

      const response = await organizationService.updateOrganization(currentOrganization.id, updateData);
      
      if (response.success) {
        toast.success('Organization profile updated successfully');
        await refreshUserData();
      } else {
        throw new Error(response.error?.message || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteUser = async () => {
    if (!currentOrganization || !inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      const inviteData: InviteUserData = {
        email: inviteEmail.trim(),
        role: inviteRole
      };

      const response = await organizationService.inviteUser(currentOrganization.id, inviteData);
      
      if (response.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setInviteRole('member');
        setInviteDialogOpen(false);
        await loadMembers();
      } else {
        throw new Error(response.error?.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!currentOrganization) return;
    
    try {
      const response = await organizationService.removeUser(currentOrganization.id, userId);
      
      if (response.success) {
        toast.success(`${userName} has been removed from the organization`);
        await loadMembers();
      } else {
        throw new Error(response.error?.message || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: OrganizationRole, userName: string) => {
    if (!currentOrganization) return;
    
    try {
      const response = await organizationService.updateUserRole(currentOrganization.id, userId, newRole);
      
      if (response.success) {
        toast.success(`${userName}'s role has been updated to ${newRole}`);
        await loadMembers();
      } else {
        throw new Error(response.error?.message || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrganization || !canDeleteOrg) return;
    if (deleteConfirmation !== currentOrganization.name) {
      toast.error('Please type the organization name exactly to confirm deletion');
      return;
    }
    
    try {
      const response = await organizationService.deleteOrganization(currentOrganization.id);
      
      if (response.success) {
        toast.success('Organization deleted successfully');
        // Redirect to dashboard or sign out
        window.location.href = '/dashboard';
      } else {
        throw new Error(response.error?.message || 'Failed to delete organization');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization');
    }
  };

  const getRoleIcon = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member':
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user || !currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600 mt-2">Manage your organization profile, members, and settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  tab === t
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {tab === 'Profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>
                Update your organization's basic information and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <img
                      src={
                        logoUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(orgName)}&background=F3F4F6&color=374151&size=128`
                      }
                      alt="Organization Logo"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                    {canEditOrg && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute -bottom-2 -right-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      disabled={!canEditOrg}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Organization Logo</h3>
                    <p className="text-sm text-gray-500">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="org-name">Organization Name *</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      disabled={!canEditOrg}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Technology, Healthcare"
                      disabled={!canEditOrg}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@company.com"
                      disabled={!canEditOrg}
                    />
                  </div>

                  <div>
                    <Label htmlFor="billing-email">Billing Email</Label>
                    <Input
                      id="billing-email"
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="billing@company.com"
                      disabled={!canEditOrg}
                    />
                  </div>
                </div>

                {canEditOrg && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users Tab */}
        {tab === 'Users' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage your organization members and their roles
                    </CardDescription>
                  </div>
                  {canManageUsers && (
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Invite User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                          <DialogDescription>
                            Send an invitation to join your organization
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="user@company.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="invite-role">Role</Label>
                            <Select value={inviteRole} onValueChange={(value: OrganizationRole) => setInviteRole(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail.trim()}>
                            {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900">
                                {member.user_profile?.full_name || member.user_profile?.email}
                              </p>
                              <Badge className={getRoleBadgeColor(member.role)}>
                                <div className="flex items-center space-x-1">
                                  {getRoleIcon(member.role)}
                                  <span className="capitalize">{member.role}</span>
                                </div>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{member.user_profile?.email}</p>
                            <p className="text-xs text-gray-400">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {canManageUsers && member.user_id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.role !== 'owner' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateUserRole(member.user_id, 'admin', member.user_profile?.full_name || member.user_profile?.email || 'User')}
                                    disabled={member.role === 'admin'}
                                  >
                                    Make Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateUserRole(member.user_id, 'member', member.user_profile?.full_name || member.user_profile?.email || 'User')}
                                    disabled={member.role === 'member'}
                                  >
                                    Make Member
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveUser(member.user_id, member.user_profile?.full_name || member.user_profile?.email || 'User')}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                    
                    {members.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No team members found
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Billing Tab */}
        {tab === 'Billing' && (
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canViewBilling ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium text-gray-900">Current Plan</h3>
                      <p className="text-2xl font-bold text-blue-600 capitalize">
                        {currentOrganization.subscription_tier}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        Status: {currentOrganization.subscription_status}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium text-gray-900">Monthly Usage</h3>
                      <p className="text-2xl font-bold text-green-600">$0</p>
                      <p className="text-sm text-gray-500">Current period</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium text-gray-900">Next Billing</h3>
                      <p className="text-2xl font-bold text-gray-900">--</p>
                      <p className="text-sm text-gray-500">No upcoming charges</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button variant="outline">
                      Upgrade Plan
                    </Button>
                    <Button variant="outline">
                      Billing History
                    </Button>
                    <Button variant="outline">
                      Update Payment Method
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  You don't have permission to view billing information
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Danger Zone Tab */}
        {tab === 'Danger Zone' && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {canDeleteOrg && (
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h3 className="font-medium text-red-900 mb-2">Delete Organization</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete an organization, there is no going back. This will permanently delete
                    the organization, all its data, and remove all team members.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Organization
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the organization
                          "{currentOrganization.name}" and all of its data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="my-4">
                        <Label htmlFor="delete-confirmation">
                          Type the organization name "{currentOrganization.name}" to confirm:
                        </Label>
                        <Input
                          id="delete-confirmation"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder={currentOrganization.name}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteOrganization}
                          className="bg-red-600 hover:bg-red-700"
                          disabled={deleteConfirmation !== currentOrganization.name}
                        >
                          Delete Organization
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              
              {!canDeleteOrg && (
                <div className="text-center py-8 text-gray-500">
                  You don't have permission to perform dangerous actions
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
