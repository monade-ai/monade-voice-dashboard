// components/audio-visualizer.tsx
'use client';

import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioData: Float32Array | null;
  isRecording: boolean;
}

export function AudioVisualizer({ audioData, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw audio visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording || !audioData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set visualizer style
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#F59E0B'; // amber-500
    
    // Draw waveform
    ctx.beginPath();
    
    const sliceWidth = width / audioData.length;
    let x = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const v = audioData[i];
      const y = (v * 0.5 + 0.5) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
  }, [audioData, isRecording]);
  
  // Draw idle animation when not recording
  useEffect(() => {
    if (isRecording || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    let animationFrame: number;
    let offset = 0;
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw flat line with small sine wave
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94A3B8'; // slate-400
      
      const lineY = height / 2;
      ctx.moveTo(0, lineY);
      
      for (let x = 0; x < width; x++) {
        // Create small sine wave effect
        const y = lineY + Math.sin((x + offset) / 15) * 3;
        ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      
      // Increment offset for animation
      offset += 0.5;
      
      // Continue animation loop
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => cancelAnimationFrame(animationFrame);
  }, [isRecording]);
  
  return (
    <div className="w-full h-24 bg-slate-50 rounded-md overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={100} 
        className="w-full h-full"
      />
    </div>
  );
}