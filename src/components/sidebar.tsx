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
  FileText,
  Users,
  Contact2,
  Megaphone,
  Rocket,
  TrendingUp,
  History,
  Sun,
  Moon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n/translations-context';
import { LanguageSelector } from '@/components/language-selector';
import { useTheme } from 'next-themes';

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
  const { theme, setTheme } = useTheme();

  // Routes where sidebar should be hidden
  const noSidebarRoutes = [
    '/login',
    '/auth/confirm',
    '/auth/auth-code-error',
    '/account',
    '/wallet',
  ];

  const hideSidebar = noSidebarRoutes.includes(pathname);

  if (hideSidebar) {
    return null;
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
          {/* Commented out - AI Campaigns handles this
          <NavItem
            href="/contacts"
            icon={<Contact2 size={18} />}
            label={t('sidebar.contacts')}
            isActive={pathname === '/contacts'}
          />
          <NavItem
            href="/campaigns"
            icon={<Megaphone size={18} />}
            label="Campaigns"
            isActive={pathname === '/campaigns'}
          />
          */}
          <NavItem
            href="/ai-campaigns"
            icon={<Rocket size={18} />}
            label="AI Campaigns"
            isActive={pathname === '/ai-campaigns'}
          />
          <NavItem
            href="/hot-leads"
            icon={<TrendingUp size={18} />}
            label="Hot Leads"
            isActive={pathname === '/hot-leads'}
          />
          <NavItem
            href="/campaign-history"
            icon={<History size={18} />}
            label="Campaign History"
            isActive={pathname === '/campaign-history'}
          />
          <NavItem
            href="/phone-numbers"
            icon={<PhoneCall size={18} />}
            label={t('sidebar.phoneNumbers')}
            isActive={pathname === '/phone-numbers'}
          />
          {/* Commented out - not needed currently
          <NavItem
            href="/tools"
            icon={<Wrench size={18} />}
            label={t('sidebar.tools')}
            isActive={pathname === '/tools'}
          />
          */}
          <NavItem
            href="/knowledge-base"
            icon={<FileText size={18} />}
            label={t('sidebar.files')}
            isActive={pathname === '/knowledge-base'}
          />
          {/* Commented out - not needed currently
          <NavItem
            href="/provider-keys"
            icon={<Key size={18} />}
            label={t('sidebar.providerKeys')}
            isActive={pathname === '/provider-keys'}
          />
          */}
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
          {/* Commented out - moved to /account page
          <NavItem
            href="/org/settings"
            icon={<Settings size={18} />}
            label={t('sidebar.orgSettingsLink')}
            isActive={pathname === '/org/settings'}
          />
          <NavItem
            href="/settings"
            icon={<Settings size={18} />}
            label={t('sidebar.accountSettingsLink')}
            isActive={pathname === '/settings'}
          />
          */}
        </nav>
      </div>

      {/* Bottom section - language and theme */}
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <LanguageSelector />
        <div className="mt-4 pt-4 border-t border-sidebar-border flex justify-center">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
