'use client';

import React from 'react';
import { GrainGradient } from '@paper-design/shaders-react';
import { cn } from '@/lib/utils';

interface PaperCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  intensity?: number;
}

export function PaperCard({ children, className, intensity = 0.05, ...props }: PaperCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm group",
        className
      )}
      {...props}
    >
      {/* Shader Background Layer */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-700">
        <GrainGradient
          width="100%"
          height="100%"
          colors={["#f3f4f6", "#e5e7eb", "#ffffff"]} /* Subtle Grays/Whites for Light Mode */
          colorBack="#ffffff"
          softness={0.1}
          intensity={intensity}
          noise={0.4}
          shape="fog"
          speed={0.2} /* Very slow, breathing movement */
          scale={1.5}
        />
      </div>

      {/* Dark Mode Overlay for Shader (Optional: Adjust colors via CSS/Props if needed for dark mode) */}
      <div className="absolute inset-0 z-0 opacity-0 dark:opacity-10 pointer-events-none bg-black" />

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function PaperCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function PaperCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function PaperCardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function PaperCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function PaperCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
