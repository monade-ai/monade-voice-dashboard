'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';

interface AudioMiniPlayerProps {
  url: string;
}

export function AudioMiniPlayer({ url }: AudioMiniPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setLoading(true);
      audioRef.current.play().catch(err => {
        console.error('Audio play failed:', err);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => { setIsPlaying(true); setLoading(false); };
    const onPause = () => { setIsPlaying(false); };
    const onEnded = () => { setIsPlaying(false); };

    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className="flex items-center">
      <audio ref={audioRef} src={url} preload="none" />
      <button 
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-black transition-all flex items-center justify-center"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>
    </div>
  );
}
