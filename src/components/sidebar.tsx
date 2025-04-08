// app/components/sidebar.tsx

'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout } from "./utils/logout";
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
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
            : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
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
              src="/calllive-logo.png"
              alt="callLive logo"
              width={140}
              height={50}
            />
          </div>
        </div>

        <SidebarSection title="ORGANIZATION">
          <div className="px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <p className="text-sm text-gray-300 truncate">mynameisgnuhgnahpis...</p>
            </div>
          </div>
          
          <NavItem
            href="/dashboard"
            icon={<BarChart4 size={18} />}
            label="Overview"
            isActive={pathname === '/dashboard' || pathname === '/'}
          />
        </SidebarSection>

        <SidebarSection title="BUILD">
          <NavItem
            href="/assistants"
            icon={<Layers size={18} />}
            label="Assistants"
            isActive={pathname === '/assistants'}
          />
          <NavItem
            href="/workflow"
            icon={<Layers size={18} />}
            label="Workflows"
            isActive={pathname === '/workflows'}
          />
          <NavItem
            href="/contacts"
            icon={<Contact2 size={18} />}
            label="Contact Lists"
            isActive={pathname === '/contacts'}
          />
          <NavItem
            href="/phone-numbers"
            icon={<PhoneCall size={18} />}
            label="Phone Numbers"
            isActive={pathname === '/phone-numbers'}
          />
          <NavItem
            href="/tools"
            icon={<Wrench size={18} />}
            label="Tools"
            isActive={pathname === '/tools'}
          />
          <NavItem
            href="/files"
            icon={<FileText size={18} />}
            label="Files"
            isActive={pathname === '/files'}
          />
          <NavItem
            href="/squads"
            icon={<Users size={18} />}
            label="Squads"
            isActive={pathname === '/squads'}
          />
          <NavItem
            href="/provider-keys"
            icon={<Key size={18} />}
            label="Provider Keys"
            isActive={pathname === '/provider-keys'}
          />
        </SidebarSection>

        <SidebarSection title="TEST">
          <NavItem
            href="/test"
            icon={<PhoneCall size={18} />}
            label="Test"
            hasChildren={true}
            isOpen={expandedSection === 'test'}
            onClick={() => toggleSection('test')}
            childItems={[
              { href: '/test/phone', label: 'Phone' },
              { href: '/test/web', label: 'Web' },
            ]}
            isActive={pathname.startsWith('/test')}
          />
        </SidebarSection>

        <SidebarSection title="OBSERVE">
          <NavItem
            href="/calls"
            icon={<PhoneCall size={18} />}
            label="Calls"
            isActive={pathname === '/calls'}
          />
        </SidebarSection>

        <SidebarSection title="COMMUNITY">
          <NavItem
            href="/community"
            icon={<Users size={18} />}
            label="Community"
            isActive={pathname === '/community'}
          />
        </SidebarSection>

        <SidebarSection title="ORG SETTINGS">
          <NavItem
            href="/org-settings"
            icon={<Settings size={18} />}
            label="Org Settings"
            isActive={pathname === '/org-settings'}
          />
        </SidebarSection>

        <SidebarSection title="ACCOUNT SETTINGS">
          <NavItem
            href="/account-settings"
            icon={<Settings size={18} />}
            label="Account Settings"
            isActive={pathname === '/account-settings'}
          />
        </SidebarSection>
      </div>

      <div className="mt-auto p-4 border-t border-gray-800">
        <NavItem
          href="/help"
          icon={<HelpCircle size={18} />}
          label="Help"
          isActive={pathname === '/help'}
        />

      <button
        onClick={logout}
        className="mt-2 flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition"
      >
        <LogOut size={18} />
        Logout
      </button>
      </div>
    </div>
  );
}