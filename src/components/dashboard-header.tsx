'use client';

import React from 'react';
import { Plus, Search, Command, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

export function DashboardHeader() {
  const router = useRouter();

  return (
    <header className="border-b border-border sticky top-0 z-30 bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center px-6 justify-between">
        
        {/* Left: Navigation / Context */}
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-medium tracking-tight uppercase text-muted-foreground">Overview</h2>
          <nav className="hidden md:flex items-center gap-4">
            <button className="text-sm font-medium text-foreground underline decoration-[#facc15] decoration-2 underline-offset-4">Insights</button>
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Logs</button>
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Usage</button>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          
          {/* Global Search / Command Bar */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 h-9 w-64 rounded-md border border-input bg-muted/50 px-9 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-text">
                <span>Search everything...</span>
                <kbd className="pointer-events-none absolute right-2.5 top-2.5 hidden h-4 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </div>
          </div>

          {/* Omni-Action Hub */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 px-3 bg-foreground text-background hover:bg-foreground/90 rounded-[4px]">
                <Plus className="h-4 w-4" />
                <span>Create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-md border-border">
              <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New Instance</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/assistants')} className="gap-2 cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-[#facc15]" />
                Assistant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/knowledge-base')} className="gap-2 cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Knowledge Base
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/ai-campaigns')} className="gap-2 cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Outbound Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4" />

          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center hover:border-foreground/20 transition-all overflow-hidden">
                    <User className="w-4 h-4 text-muted-foreground" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
                <DropdownMenuItem onClick={() => router.push('/account')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) {
    return (
        <div className={cn(
            "bg-border shrink-0",
            orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
            className
        )} />
    )
}

import { cn } from '@/lib/utils';
