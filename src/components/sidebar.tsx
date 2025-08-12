// app/components/sidebar.tsx

'use client';

import Image from 'next/image';
import React from 'react';
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
  Contact2,
  LogOut,
  Sun, 
  Moon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n/translations-context';
import { LanguageSelector } from '@/components/language-selector';
import { useTheme } from '@/components/theme-provider';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { signOut } from '@/app/protected/actions'; // Import the new signOut Server Action
import { useAuth } from '@/contexts/auth-context'; // Import the new useAuth hook

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

function NavItem({ href, icon, label, isActive = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center p-2 my-1 rounded-md transition-colors group',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground/60 hover:bg-muted hover:text-foreground',
      )}
    >
      <div className="mr-3">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslations();
  const { user, isLoading: authLoading } = useAuth(); // Use the new useAuth hook
  const isLoggingOut = false; // Placeholder, as signOut is a server action
  // TODO: Implement proper permission checks using user roles from Supabase metadata/DB
  const canViewOrgSettings = true; // Placeholder
  const { theme, toggleTheme } = useTheme();

  // Routes where sidebar should be hidden
  const noSidebarRoutes = [
    '/login',
    '/auth/confirm',
    '/auth/auth-code-error',
    // Add other public routes here
  ];

  const hideSidebar = noSidebarRoutes.includes(pathname);

  if (hideSidebar) {
    return null; // Don't render sidebar on these routes
  }

  return (
    <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto shadow-md">
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

        <nav className="flex flex-col space-y-1">
          <NavItem
            href="/dashboard"
            icon={<BarChart4 size={18} />}
            label={t('sidebar.overview')}
            isActive={pathname === '/dashboard' || pathname === '/'}
          />
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
          <NavItem
            href="/call-history"
            icon={<PhoneCall size={18} />}
            label={t('sidebar.callHistory')}
            isActive={pathname === '/call-history'}
          />
          <NavItem
            href="/community"
            icon={<Users size={18} />}
            label={t('sidebar.communityLink')}
            isActive={pathname === '/community'}
          />
          {user && canViewOrgSettings && (
            <NavItem
              href="/org/settings"
              icon={<Settings size={18} />}
              label={t('sidebar.orgSettingsLink')}
              isActive={pathname === '/org/settings'}
            />
          )}
          {user && (
            <NavItem
              href="/settings"
              icon={<Settings size={18} />}
              label={t('sidebar.accountSettingsLink')}
              isActive={pathname === '/settings'}
            />
          )}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-sidebar-border">
        <OrganizationSwitcher />
        <div className="px-3 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <p className="text-sm text-foreground/80 truncate">
              {authLoading ? 'Loading...' : user?.email || 'Guest'}
            </p>
          </div>
        </div>
        <NavItem
          href="/help"
          icon={<HelpCircle size={18} />}
          label={t('sidebar.help')}
          isActive={pathname === '/help'}
        />

        <form action={signOut}>
          <button
            type="submit"
            disabled={isLoggingOut || authLoading}
            className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={18} />
            {isLoggingOut ? t('sidebar.loggingOut') || 'Logging out...' : t('sidebar.logout')}
          </button>
        </form>
        
        <div className="mt-4 pt-4 border-t border-sidebar-border">
          <LanguageSelector />
        </div>

        <div className="mt-4 pt-4 border-t border-sidebar-border flex justify-center">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
