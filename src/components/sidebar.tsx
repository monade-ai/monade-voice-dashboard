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
  BookOpen,
  Rocket,
  TrendingUp,
  History,
  Sun,
  Moon,
  ChevronRight,
  Globe,
  Server,
  Radio,
  Key,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRunningCampaigns } from '@/app/hooks/use-running-campaigns';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  count?: number;
  isLive?: boolean;
  target?: string;
}

function NavItem({ href, icon, label, isActive = false, count, isLive = false, target }: NavItemProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
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
          'transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const runningCampaigns = useRunningCampaigns();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveTheme = mounted ? (resolvedTheme ?? theme) : undefined;
  const isDark = effectiveTheme === 'dark';

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
      <div className="px-6 py-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group/logo w-fit"
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <Image
              src="/monade-logo.png"
              alt="Monade"
              width={40}
              height={40}
              priority
              className="object-contain transition-transform duration-300 group-hover/logo:scale-110"
            />
          </div>
          <span className="text-2xl font-bold tracking-tighter text-foreground transition-colors group-hover/logo:text-primary">
            Monade
          </span>
        </Link>
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
          href="/campaigns"
          icon={<Rocket />}
          label="Campaigns"
          isActive={pathname === '/campaigns'}
          count={runningCampaigns}
        />
        <NavItem
          href="/hot-leads"
          icon={<TrendingUp />}
          label="Hot Leads"
          isActive={pathname === '/hot-leads'}
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
          href="/trunks"
          icon={<Server />}
          label="Trunks"
          isActive={pathname === '/trunks'}
        />
        <NavItem
          href="/sessions"
          icon={<Radio />}
          label="Live Sessions"
          isActive={pathname === '/sessions'}
        />
        <NavItem
          href="/phone-numbers"
          icon={<PhoneCall />}
          label="Telephony"
          isActive={pathname === '/phone-numbers'}
        />

        <CategoryLabel>Developer</CategoryLabel>
        <NavItem
          href="/api-keys"
          icon={<Key />}
          label="API Keys"
          isActive={pathname === '/api-keys'}
        />
        <NavItem
          href="https://monade-voice-docs.netlify.app/"
          icon={<BookOpen />}
          label="Documentation"
          isActive={false}
          target="_blank"
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
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center justify-center gap-2 py-1.5 rounded-[4px] border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          >
            {mounted ? (isDark ? <Sun size={14} /> : <Moon size={14} />) : <Sun size={14} />}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {mounted ? (isDark ? 'Light' : 'Dark') : 'Theme'}
            </span>
          </button>
          <button className="flex items-center justify-center gap-2 py-1.5 rounded-[4px] border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
            <Globe size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">EN</span>
          </button>
        </div>

      </div>
    </div>
  );
}
