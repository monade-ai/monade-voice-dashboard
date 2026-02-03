'use client';

import React, { useMemo } from 'react';
import { StaticRadialGradient } from '@paper-design/shaders-react';

interface LeadIconProps {
  seed: string;
  size?: number;
}

// Generate professional color palettes based on a seed string
const getPalette = (seed: string) => {
  const hash = seed.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  
  // Professional palettes (Lemon, Earth, Ocean, Slate)
  const palettes = [
    ["#facc15", "#eab308", "#713f12"], // Lemon/Gold
    ["#3b82f6", "#1d4ed8", "#1e3a8a"], // Blue/Ocean
    ["#10b981", "#047857", "#064e3b"], // Green/Emerald
    ["#8b5cf6", "#6d28d9", "#4c1d95"], // Purple/Amethyst
    ["#f43f5e", "#be123c", "#881337"], // Rose/Deep Red
    ["#64748b", "#334155", "#0f172a"], // Slate/Obsidian
  ];
  
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
};

export function LeadIcon({ seed, size = 36 }: LeadIconProps) {
  const palette = useMemo(() => getPalette(seed), [seed]);

  return (
    <div 
      className="relative overflow-hidden rounded-full border border-border/40 shadow-sm"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 scale-150">
        <StaticRadialGradient
          width={size * 2}
          height={size * 2}
          colors={palette}
          colorBack="#000000"
          radius={1}
          focalDistance={0}
          focalAngle={0}
          falloff={0.9}
          mixing={0.7}
          distortion={0}
          distortionShift={0}
          distortionFreq={12}
          grainMixer={1}
          grainOverlay={0.5}
        />
      </div>
    </div>
  );
}
