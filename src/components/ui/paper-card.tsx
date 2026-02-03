'use client';

import React from 'react';
import { StaticMeshGradient } from '@paper-design/shaders-react';

import { cn } from '@/lib/utils';

interface PaperCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'mesh';
  shaderProps?: any;
}

export function PaperCard({ children, className, variant = 'mesh', shaderProps, ...props }: PaperCardProps) {
  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-card text-card-foreground group transition-colors',
        className,
      )}
      {...props}
    >
      {/* Shader Background Layer - Reduced opacity in light mode for better contrast */}
      {variant === 'mesh' && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.15] dark:opacity-40 group-hover:opacity-25 dark:group-hover:opacity-60 transition-opacity duration-700">
          <StaticMeshGradient
            width="100%"
            height="100%"
            colors={shaderProps?.colors || ['#facc15', '#e5e7eb', '#ffffff', '#b1aa91']}
            positions={shaderProps?.positions || 42}
            waveX={shaderProps?.waveX || 0.45}
            waveXShift={shaderProps?.waveXShift || 0}
            waveY={shaderProps?.waveY || 1}
            waveYShift={shaderProps?.waveYShift || 0}
            mixing={shaderProps?.mixing || 0}
            grainMixer={shaderProps?.grainMixer || 0.37}
            grainOverlay={shaderProps?.grainOverlay || 0.78}
          />
        </div>
      )}

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function PaperCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 p-5', className)} {...props} />;
}

export function PaperCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  // Switched from text-muted-foreground/70 to text-foreground/80 for much higher contrast
  return <h3 className={cn('text-[10px] font-bold uppercase tracking-[0.3em] text-foreground/80 dark:text-muted-foreground/90', className)} {...props} />;
}

export function PaperCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function PaperCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0 border-t border-border/10', className)} {...props} />;
}
