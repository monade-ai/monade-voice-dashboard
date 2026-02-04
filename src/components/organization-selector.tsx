'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check, Building2, Plus } from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthProvider';

interface OrganizationSelectorProps {
  className?: string;
}

export function OrganizationSelector({ className = '' }: OrganizationSelectorProps) {
  const { currentOrganization, organizations, switchOrganization, loading } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) {
      setIsOpen(false);

      return;
    }

    setSwitching(orgId);
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setSwitching(null);
    }
  };

  if (loading || !currentOrganization) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded-md w-48"></div>
      </div>
    );
  }

  // Don't show selector if user only has one organization
  if (organizations.length <= 1) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-900 truncate">
          {currentOrganization.name}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="truncate">{currentOrganization.name}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1">
              {/* Current Organizations */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Your Organizations
              </div>
              
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id)}
                  disabled={switching === org.id}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {switching === org.id && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    )}
                    {org.id === currentOrganization.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
              
              {/* Create New Organization */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/org/create');
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                  <Plus className="h-4 w-4 text-gray-400 mr-2" />
                  Create new organization
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Compact version for mobile/sidebar
export function CompactOrganizationSelector({ className = '' }: OrganizationSelectorProps) {
  const { currentOrganization, organizations, switchOrganization, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) {
      setIsOpen(false);

      return;
    }

    setSwitching(orgId);
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setSwitching(null);
    }
  };

  if (loading || !currentOrganization) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex-shrink-0 h-6 w-6 bg-blue-600 rounded text-white text-xs font-medium flex items-center justify-center">
          {getInitials(currentOrganization.name)}
        </div>
        <span className="text-sm font-medium text-gray-900 truncate max-w-32">
          {currentOrganization.name}
        </span>
        {organizations.length > 1 && (
          <ChevronDown className="h-3 w-3 text-gray-400" />
        )}
      </button>

      {isOpen && organizations.length > 1 && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute z-20 left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id)}
                  disabled={switching === org.id}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 h-5 w-5 bg-blue-600 rounded text-white text-xs font-medium flex items-center justify-center">
                      {getInitials(org.name)}
                    </div>
                    <span className="truncate">{org.name}</span>
                  </div>
                  
                  {switching === org.id && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  )}
                  {org.id === currentOrganization.id && (
                    <Check className="h-3 w-3 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
