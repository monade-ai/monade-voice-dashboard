'use client';

import React, { useState } from 'react';
import { Play, Pause, MoreVertical, Download, Share2, Volume2 } from 'lucide-react';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
} from '@/components/ui/dropdown-menu';

export function AudioPill() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex items-center gap-4 bg-muted/20 border border-border/40 rounded-full pl-2 pr-4 py-2 w-full max-w-4xl shadow-sm group transition-all">
      
      {/* Play/Pause Button */}
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center justify-center shadow-md"
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Progress / Info Area (Flexible Width) */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold font-mono text-foreground tracking-tighter">01:24</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 hidden sm:inline">Stream Progress</span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground/60">04:12</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative">
          {/* Real-time pulse bar */}
          <div className="absolute inset-0 bg-primary/40 w-[35%] transition-all duration-500" />
          <div className="absolute top-0 left-[35%] h-full w-px bg-primary shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
        </div>
      </div>

      {/* Volume / Menu Actions */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50">
          <Volume2 size={16} />
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50 focus:outline-none">
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md z-[110] border-border/40 bg-background/95 backdrop-blur-md">
            <DropdownMenuItem className="gap-3 cursor-pointer py-2.5">
              <Download size={14} className="text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Download Recording</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 cursor-pointer py-2.5">
              <Share2 size={14} className="text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Generate Share Link</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
