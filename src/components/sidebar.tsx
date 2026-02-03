'use client';

import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart4,
  Layers,
  PhoneCall,
  FileText,
  Users,
  Rocket,
  TrendingUp,
  History,
  Sun,
  Moon,
  Settings,
  ChevronRight,
  Globe
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslations } from '@/i18n/translations-context';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/auth-context';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  count?: number;
  isLive?: boolean;
}

function NavItem({ href, icon, label, isActive = false, count, isLive = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center justify-between px-3 py-2 my-0.5 rounded-[4px] transition-all duration-200',
        isActive
          ? 'bg-primary/10 text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
      )}
    >
      {/* The "Needle" Active Indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-primary rounded-full" />
      )}
      
      <div className="flex items-center gap-3">
        <div className={cn(
            "transition-colors",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
            {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
        <span className="text-sm tracking-tight">{label}</span>
      </div>

      {isLive && (
        <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      )}

      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded-[2px] text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
            {count}
        </span>
      )}
    </Link>
  );
}

function CategoryLabel({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="px-3 mt-8 mb-2 text-[9px] font-bold uppercase tracking-[0.4em] text-muted-foreground/40 select-none">
            {children}
        </h3>
    );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslations();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Get user display info
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  const noSidebarRoutes = ['/login', '/auth/confirm', '/auth/auth-code-error'];
  if (noSidebarRoutes.includes(pathname)) return null;

  return (
    <div className="w-64 h-full bg-background flex flex-col relative group/sidebar">
      
      {/* Ghost Border */}
      <div className="absolute right-0 top-10 bottom-10 w-[1px] bg-border/40" />

      {/* Header: Brand Logo */}
      <div className="p-6 pb-2">
        <div className="flex items-center mb-4">
            <Image
              src="/monade-logo.png"
              alt="monade logo"
              width={120}
              height={40}
              priority
              className="dark:invert-0"
            />
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        
        <CategoryLabel>Main</CategoryLabel>
        <NavItem
          href="/dashboard"
          icon={<BarChart4 />}
          label="Overview"
          isActive={pathname === '/dashboard' || pathname === '/'}
        />

        <CategoryLabel>Operations</CategoryLabel>
        <NavItem
          href="/assistants"
          icon={<Layers />}
          label="Assistants"
          isActive={pathname === '/assistants'}
          isLive={true}
        />
        <NavItem
          href="/ai-campaigns"
          icon={<Rocket />}
          label="AI Campaigns"
          isActive={pathname === '/ai-campaigns'}
          count={3}
        />
        <NavItem
          href="/hot-leads"
          icon={<TrendingUp />}
          label="Hot Leads"
          isActive={pathname === '/hot-leads'}
          count={12}
        />

        <CategoryLabel>Archive</CategoryLabel>
        <NavItem
          href="/campaign-history"
          icon={<History />}
          label="Campaign History"
          isActive={pathname === '/campaign-history'}
        />
         <NavItem
          href="/call-history"
          icon={<PhoneCall />}
          label="Call Logs"
          isActive={pathname === '/call-history'}
        />
        <NavItem
          href="/knowledge-base"
          icon={<FileText />}
          label="Library"
          isActive={pathname === '/knowledge-base'}
        />

        <CategoryLabel>Connectivity</CategoryLabel>
        <NavItem
          href="/phone-numbers"
          icon={<PhoneCall />}
          label="Telephony"
          isActive={pathname === '/phone-numbers'}
        />
        <NavItem
          href="/community"
          icon={<Users />}
          label="Community"
          isActive={pathname === '/community'}
        />
      </nav>

      {/* Bottom: User & System Concierge */}
      <div className="p-3 mt-auto border-t border-border/20">
        
        {/* User Card: Connects to Settings & Fetches Real Data */}
        <button 
            onClick={() => router.push('/settings')}
            className="w-full flex items-center justify-between p-2 rounded-[4px] hover:bg-muted/50 transition-all group border border-transparent hover:border-border/40"
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                    <span className="text-xs font-bold text-primary">{initial}</span>
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-xs font-medium truncate w-32">{displayName}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest truncate w-32">{displayEmail}</span>
                </div>
            </div>
            <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <div className="grid grid-cols-2 gap-2 mt-4">
            <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-center gap-2 py-1.5 rounded-[4px] border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
            >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                <span className="text-[10px] font-bold uppercase tracking-wider">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-1.5 rounded-[4px] border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
                <Globe size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">EN</span>
            </button>
        </div>

        <button 
            onClick={() => router.push('/settings')}
            className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
        >
            <Settings size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
        </button>
      </div>
    </div>
  );
}
