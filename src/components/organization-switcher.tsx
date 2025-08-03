'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Building2, Crown, Shield, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizationRole } from '@/types';

export function OrganizationSwitcher() {
  const { user, currentOrganization, organizations, userRole, switchOrganization } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleSwitchOrganization = async (organizationId: string) => {
    if (switching || !user || organizationId === currentOrganization?.id) return;
    
    setSwitching(true);
    try {
      await switchOrganization(organizationId);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleIcon = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      case 'member':
        return <User className="h-3 w-3 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || !currentOrganization) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center space-x-2 text-gray-500">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">No organization</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-auto p-2 hover:bg-gray-50"
            disabled={switching}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                  {currentOrganization.name}
                </span>
                {userRole && (
                  <Badge variant="outline" className={cn("text-xs h-4 px-1", getRoleBadgeColor(userRole))}>
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(userRole)}
                      <span className="capitalize">{userRole}</span>
                    </div>
                  </Badge>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Switch Organization
            </p>
          </div>
          
          <DropdownMenuSeparator />
          
          {organizations.map((org) => {
            const isCurrentOrg = org.id === currentOrganization?.id;
            // Find user's role in this organization
            const membership = user.organizations.find(m => m.organization_id === org.id);
            const orgRole = membership?.role;
            
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitchOrganization(org.id)}
                className={cn(
                  "flex items-center justify-between p-2 cursor-pointer",
                  isCurrentOrg && "bg-blue-50"
                )}
                disabled={switching || isCurrentOrg}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {org.name}
                    </span>
                    {orgRole && (
                      <div className="flex items-center space-x-1 mt-0.5">
                        {getRoleIcon(orgRole)}
                        <span className="text-xs text-gray-500 capitalize">{orgRole}</span>
                      </div>
                    )}
                  </div>
                </div>
                {isCurrentOrg && <Check className="h-4 w-4 text-blue-600" />}
              </DropdownMenuItem>
            );
          })}
          
          {organizations.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-gray-500">
              No organizations available
            </div>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem className="flex items-center space-x-2 p-2 cursor-pointer">
            <Plus className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">Create Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}