// app/components/sidebar.tsx

'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart4, 
  Layers, 
  PhoneCall, 
  Settings, 
  Wrench, 
  FileText, 
  Users, 
  Key, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Contact2,
  LogOut,
  Globe,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n/translations-context';
import { LanguageSelector } from '@/components/language-selector';

import { useLogout } from './utils/logout';
import { useAuth } from '@/lib/auth/AuthProvider';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  hasChildren?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  childItems?: Array<{ href: string; label: string }>;
}

function NavItem({
  href,
  icon,
  label,
  isActive = false,
  hasChildren = false,
  isOpen = false,
  onClick,
  childItems = [],
}: NavItemProps) {
  return (
    <>
      <Link
        href={href}
        className={cn(
          'flex items-center p-2 my-1 rounded-md transition-colors group',
          isActive
            ? 'bg-amber-100 text-amber-700'
            : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700',
        )}
        onClick={hasChildren ? onClick : undefined}
      >
        <div className="mr-3 text-xl">{icon}</div>
        <span className="text-sm">{label}</span>
        {hasChildren && (
          <div className="ml-auto">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        )}
      </Link>

      {hasChildren && isOpen && (
        <div className="ml-6 border-l-2 border-gray-800 pl-2 py-1">
          {childItems.map((item, index) => (
            <Link
              key={`child-${index}`}
              href={item.href}
              className="flex items-center p-2 text-sm text-gray-400 hover:text-gray-100 rounded-md"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function SidebarSection({ title, children }: SectionProps) {
  return (
    <div className="mb-4">
      <div className="px-4 py-2">
        <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { t } = useTranslations();
  const { user, loading } = useAuth();

  const logout = useLogout();

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col overflow-y-auto shadow-md">
      <div className="p-4">
        <div className="flex items-center mb-8">
          <div className="ml-2">
            <Image
              src="/monade-logo.png"
              alt="monade logo"
              width={140}
              height={50}
            />
          </div>
        </div>

        <SidebarSection title={t('sidebar.organization')}>
          <div className="px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <p className="text-sm text-gray-700 truncate">
                {loading ? 'Loading...' : user?.email || ''}
              </p>
            </div>
          </div>
          
          <NavItem
            href="/dashboard"
            icon={<BarChart4 size={18} />}
            label={t('sidebar.overview')}
            isActive={pathname === '/dashboard' || pathname === '/'}
          />
        </SidebarSection>

        <SidebarSection title={t('sidebar.build')}>
          <NavItem
            href="/assistants"
            icon={<Layers size={18} />}
            label={t('sidebar.assistants')}
            isActive={pathname === '/assistants'}
          />
          <NavItem
            href="/workflow"
            icon={<Layers size={18} />}
            label={t('sidebar.workflows')}
            isActive={pathname === '/workflows'}
          />
          <NavItem
            href="/contacts"
            icon={<Contact2 size={18} />}
            label={t('sidebar.contacts')}
            isActive={pathname === '/contacts'}
          />
          <NavItem
            href="/phone-numbers"
            icon={<PhoneCall size={18} />}
            label={t('sidebar.phoneNumbers')}
            isActive={pathname === '/phone-numbers'}
          />
          <NavItem
            href="/tools"
            icon={<Wrench size={18} />}
            label={t('sidebar.tools')}
            isActive={pathname === '/tools'}
          />
          <NavItem
            href="/knowledge-base"
            icon={<FileText size={18} />}
            label={t('sidebar.files')}
            isActive={pathname === '/knowledge-base'}
          />
          <NavItem
            href="/provider-keys"
            icon={<Key size={18} />}
            label={t('sidebar.providerKeys')}
            isActive={pathname === '/provider-keys'}
          />
        </SidebarSection>

        {/* Removed TEST section */}

        <SidebarSection title={t('sidebar.observe')}>
          <NavItem
            href="/call-history"
            icon={<PhoneCall size={18} />}
            label={t('sidebar.callHistory')}
            isActive={pathname === '/call-history'}
          />
        </SidebarSection>

        <SidebarSection title={t('sidebar.community')}>
          <NavItem
            href="/community"
            icon={<Users size={18} />}
            label={t('sidebar.communityLink')}
            isActive={pathname === '/community'}
          />
        </SidebarSection>

        {/* Org Settings: Only show for org admins/owners */}
        {user && user.isOrgAdmin && (
          <SidebarSection title={t('sidebar.orgSettings')}>
            <NavItem
              href="/org/settings"
              icon={<Settings size={18} />}
              label={t('sidebar.orgSettingsLink')}
              isActive={pathname === '/org/settings'}
            />
          </SidebarSection>
        )}

        {/* Account Settings: Show for all authenticated users */}
        {user && (
          <SidebarSection title={t('sidebar.accountSettings')}>
            <NavItem
              href="/settings"
              icon={<Settings size={18} />}
              label={t('sidebar.accountSettingsLink')}
              isActive={pathname === '/settings'}
            />
          </SidebarSection>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-gray-800">
        <NavItem
          href="/help"
          icon={<HelpCircle size={18} />}
          label={t('sidebar.help')}
          isActive={pathname === '/help'}
        />

        <button
          onClick={logout}
          className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition"
        >
          <LogOut size={18} />
          {t('sidebar.logout')}
        </button>
        
        {/* Language Selector - heading removed, only dropdown shown */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
}
