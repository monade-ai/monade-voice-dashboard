'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react';
import * as THREE from 'three';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

interface VoiceModel {
  id: string;
  name: string;
  description: string;
  features: string[];
  voices: VoiceOption[];
  color: string;
}

const voiceModels: VoiceModel[] = [
  {
    id: 'conversational',
    name: 'Conversational',
    description: 'Natural, friendly dialogue for customer service and support',
    features: [
      'Natural Speech Patterns',
      'Emotion Recognition',
      'Context Awareness',
      'Multi-turn Conversations',
    ],
    color: '#3A8DFF',
    voices: [
      { id: 'algieba', name: 'Algieba', description: 'Warm & Professional', avatar: 'avatars/01.png' },
      { id: 'aoede', name: 'Aoede', description: 'Friendly & Approachable', avatar: 'avatars/02.png' },
      { id: 'autonoe', name: 'Autonoe', description: 'Calm & Reassuring', avatar: 'avatars/04.png' },
      { id: 'callirrhoe', name: 'Callirrhoe', description: 'Energetic & Upbeat', avatar: 'avatars/05.png' },
      { id: 'charon', name: 'Charon', description: 'Clear & Articulate', avatar: 'avatars/06.png' },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Authoritative and clear for business and enterprise applications',
    features: [
      'Executive Presence',
      'Technical Accuracy',
      'Formal Tone',
      'Industry Terminology',
      'Compliance Ready',
    ],
    color: '#39594D',
    voices: [
      { id: 'despina', name: 'Despina', description: 'Executive Authority', avatar: 'avatars/07.png' },
      { id: 'ennceladus', name: 'Ennceladus', description: 'Corporate Elegance', avatar: 'avatars/08.png' },
      { id: 'erinome', name: 'Erinome', description: 'Technical Expert', avatar: 'avatars/09.png' },
      { id: 'fenrir', name: 'Fenrir', description: 'Strategic Advisor', avatar: 'avatars/10.png' },
      { id: 'iapetus', name: 'Iapetus', description: 'Industry Leader', avatar: 'avatars/12.png' },
    ],
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Expressive and dynamic for entertainment and creative content',
    features: [
      'Dynamic Range',
      'Character Voices',
      'Storytelling',
      'Emotional Depth',
      'Creative Expression',
    ],
    color: '#D18EE2',
    voices: [
      { id: 'kore', name: 'Kore', description: 'Artistic & Expressive', avatar: 'avatars/13.png' },
      { id: 'leda', name: 'Leda', description: 'Bold & Dynamic', avatar: 'avatars/15.png' },
      { id: 'orus', name: 'Orus', description: 'Mystical & Wise', avatar: 'avatars/19.png' },
      { id: 'puck', name: 'Puck', description: 'Flowing & Melodic', avatar: 'avatars/20.png' },
      { id: 'umbriel', name: 'Umbriel', description: 'Bright & Energetic', avatar: 'avatars/22.png' },
      { id: 'zephyr', name: 'Zephyr', description: 'Bright & Energetic', avatar: 'avatars/24.png' },
    ],
  },
];

interface VoiceAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (modelId: string) => void;
}

export function VoiceAssistantDialog({
  open,
  onOpenChange,
  onSelect,
}: VoiceAssistantDialogProps) {
  const [activeInfoCard, setActiveInfoCard] = useState<string | null>(null);

  const handleInfoClick = (cardId: string) => {
    setActiveInfoCard(activeInfoCard === cardId ? null : cardId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[75vw] max-w-[75vw] h-[70vh] bg-white border-[#E5E5E0] p-12 overflow-y-auto">
        <div className="relative h-full">
          {/* <Button
            variant="ghost"
            size="icon"
            className="absolute -top-6 -right-6 text-[#181A1B] hover:bg-[#E5E5E0] z-50"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-6 h-6" />
          </Button> */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 h-full">
            {voiceModels.map((model) => (
              <VoiceModelCard
                key={model.id}
                model={model}
                showInfo={activeInfoCard === model.id}
                onInfoClick={() => handleInfoClick(model.id)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VoiceModelCardProps {
  model: VoiceModel;
  showInfo: boolean;
  onInfoClick?: () => void;
  onSelect?: (modelId: string) => void;
}

function VoiceModelCard({ model, showInfo, onInfoClick, onSelect }: VoiceModelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Store geometry and material references for reuse
  const waveGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const waveMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const wavePointsRef = useRef<THREE.Points | null>(null);
  const gridGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const gridMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const gridPointsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (mountRef.current && !rendererRef.current) {
      initThreeJS();
    }
    
    if (isHovered && !showInfo) {
      playAudio();
      startVisualization();
    } else {
      stopAudio();
      stopVisualization();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHovered, showInfo, selectedVoice, initThreeJS, playAudio, startVisualization, stopAudio, stopVisualization]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Dispose of geometries and materials
      if (waveGeometryRef.current) waveGeometryRef.current.dispose();
      if (waveMaterialRef.current) waveMaterialRef.current.dispose();
      if (gridGeometryRef.current) gridGeometryRef.current.dispose();
      if (gridMaterialRef.current) gridMaterialRef.current.dispose();
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  const initThreeJS = useCallback(() => {
    if (!mountRef.current) return;

    // Ensure element has dimensions
    const rect = mountRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Retry initialization after a short delay
      setTimeout(initThreeJS, 100);

      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(rect.width, rect.height);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    camera.position.z = 5;

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
  }, []);

  const updateWaveGeometry = useCallback((time: number) => {
    if (!sceneRef.current) return;

    const color = new THREE.Color(model.color);

    // Initialize wave geometry and material if not exists
    if (!waveGeometryRef.current) {
      waveGeometryRef.current = new THREE.BufferGeometry();
      waveMaterialRef.current = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      wavePointsRef.current = new THREE.Points(waveGeometryRef.current, waveMaterialRef.current);
      sceneRef.current.add(wavePointsRef.current);
    }

    // Create flowing wave lines
    const vertices = [];
    const colors = [];
    
    for (let i = 0; i < 100; i++) {
      const x = (i / 50) - 1;
      const y1 = Math.sin(x * 8 + time * 2) * 0.3;
      const y2 = Math.sin(x * 6 + time * 1.5 + 1) * 0.2;
      const y3 = Math.sin(x * 10 + time * 3 + 2) * 0.1;
      
      vertices.push(x, y1, 0);
      vertices.push(x, y2, 0);
      vertices.push(x, y3, 0);
      
      // Use RGB only (3 components) instead of RGBA
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    }

    // Update existing geometry attributes
    waveGeometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    waveGeometryRef.current.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    waveGeometryRef.current.attributes.position.needsUpdate = true;
    waveGeometryRef.current.attributes.color.needsUpdate = true;
  }, [model.color]);

  const updateGridGeometry = useCallback((time: number) => {
    if (!sceneRef.current) return;

    const color = new THREE.Color(model.color);

    // Initialize grid geometry and material if not exists
    if (!gridGeometryRef.current) {
      gridGeometryRef.current = new THREE.BufferGeometry();
      gridMaterialRef.current = new THREE.PointsMaterial({
        size: 0.005,
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
      });
      gridPointsRef.current = new THREE.Points(gridGeometryRef.current, gridMaterialRef.current);
      sceneRef.current.add(gridPointsRef.current);
    }

    // Add subtle grid
    const gridVertices = [];
    const gridColors = [];
    
    for (let i = -20; i <= 20; i += 2) {
      for (let j = -20; j <= 20; j += 2) {
        const x = i * 0.1;
        const y = j * 0.1;
        const z = Math.sin(time + x * 2 + y * 2) * 0.05;
        
        gridVertices.push(x, y, z);
        // Use RGB only (3 components)
        gridColors.push(color.r, color.g, color.b);
      }
    }
    
    // Update existing geometry attributes
    gridGeometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    gridGeometryRef.current.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));
    gridGeometryRef.current.attributes.position.needsUpdate = true;
    gridGeometryRef.current.attributes.color.needsUpdate = true;
  }, [model.color]);

  const startVisualization = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    if (animationRef.current) return; // Already running

    const animate = () => {
      if (!isHovered || showInfo) {
        animationRef.current = null;

        return; // Stop animation
      }

      const time = Date.now() * 0.001;
      
      // Update geometries instead of recreating
      updateWaveGeometry(time);
      updateGridGeometry(time);

      // Use stored camera reference
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isHovered, showInfo, updateWaveGeometry, updateGridGeometry]);

  const stopVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async () => {
    if (audioRef.current) {
      try {
        audioRef.current.src = `/audio/${model.voices[selectedVoice].id}.wav`;
        await audioRef.current.play();
      } catch (error) {
        console.log('Audio play failed:', error);
      }
    }
  }, [model.voices, selectedVoice]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // "Creative" card: frosted glass, blur, "Coming Soon", no select
  const isComingSoon = model.id === 'creative';

  return (
    <div
      className={`relative bg-white border-2 rounded-3xl overflow-hidden transition-all duration-700 ease-out ${
        isComingSoon
          ? 'pointer-events-none select-none opacity-80'
          : 'cursor-pointer'
      } ${
        isHovered && !isComingSoon
          ? 'shadow-2xl scale-105 border-opacity-100'
          : 'border-[#E5E5E0] hover:border-[#39594D]'
      }`}
      onMouseEnter={() => !isComingSoon && setIsHovered(true)}
      onMouseLeave={() => !isComingSoon && setIsHovered(false)}
      style={{
        borderColor: isHovered && !isComingSoon ? model.color : undefined,
        minHeight: '600px',
        filter: isComingSoon ? 'blur(0px)' : undefined,
      }}
    >
      <audio ref={audioRef} />
      <div 
        ref={mountRef} 
        className="absolute inset-0 w-full h-full opacity-30"
        style={{ pointerEvents: 'none' }}
      />

      {!isComingSoon && onInfoClick && (
        <button
          type="button"
          className="absolute top-4 right-4 z-30 rounded-full bg-white/90 p-2 text-[#39594D] shadow-md transition hover:bg-white"
          onClick={(event) => {
            event.stopPropagation();
            onInfoClick();
          }}
          aria-label={showInfo ? 'Hide model details' : 'Show model details'}
        >
          <Info className="h-4 w-4" />
        </button>
      )}

      {showInfo && (
        <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <h4 className="text-white font-bold text-2xl">{model.name} Features</h4>
            <div className="grid gap-3">
              {model.features.map((feature, index) => (
                <div
                  key={index}
                  className="text-white/90 text-sm bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm border border-white/20"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Frosted glass overlay for "Coming Soon" */}
      {isComingSoon && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-lg bg-white/40">
          <div className="text-3xl font-bold text-[#181A1B] mb-2 drop-shadow-lg">Creative</div>
          <div className="px-6 py-3 rounded-2xl bg-white/60 border border-white/40 shadow-lg text-xl font-semibold text-[#39594D] backdrop-blur-md" style={{ letterSpacing: 1 }}>
            Coming Soon
          </div>
        </div>
      )}

      <div className="relative z-10 p-8 h-full flex flex-col">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-[#181A1B] mb-2">{model.name}</h3>
          <p className="text-[#39594D] text-sm opacity-80">{model.description}</p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <VoiceCarousel
            voices={model.voices}
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            accentColor={model.color}
          />
        </div>

        {/* Only show select button for non-coming-soon cards */}
        {!isComingSoon && isHovered && !showInfo && (
          <div className="absolute bottom-8 left-8 right-8">
            <Button
              className="w-full text-white font-semibold py-4 rounded-xl transition-all duration-500 transform hover:scale-105"
              style={{ backgroundColor: model.color }}
              onClick={() => onSelect && onSelect(model.id)}
            >
              Select {model.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface VoiceCarouselProps {
  voices: VoiceOption[];
  selectedVoice: number;
  onVoiceChange: (index: number) => void;
  accentColor: string;
}

function VoiceCarousel({ voices, selectedVoice, onVoiceChange, accentColor }: VoiceCarouselProps) {
  const getVisibleVoices = () => {
    const result = [];
    for (let i = -2; i <= 2; i++) {
      const index = (selectedVoice + i + voices.length) % voices.length;
      result.push({
        voice: voices[index],
        position: i,
        index,
      });
    }

    return result;
  };

  const selectedVoiceObj = voices[selectedVoice];

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-center space-x-2 mb-4">
        <div className="flex items-center space-x-2 overflow-hidden">
          {getVisibleVoices().map(({ voice, position, index }) => {
            const isCenter = position === 0;
            const size = isCenter ? 80 : 50;
            const opacity = Math.max(0.3, 1 - Math.abs(position) * 0.3);

            // For the center (selected) voice, add hover-to-play handlers
            if (isCenter) {
              return (
                <button
                  key={`${voice.id}-${index}`}
                  onClick={() => onVoiceChange(index)}
                  className={'relative transition-all duration-500 ease-out rounded-full overflow-hidden ring-2 ring-offset-2'}
                  style={{
                    width: size,
                    height: size,
                    opacity,
                    boxShadow: `0 0 0 4px ${accentColor}`,
                    transform: 'scale(0.8)',
                  }}
                  aria-label={`Select voice ${voice.name}`}
                >
                  <Image
                    src={`/${voice.avatar}`}
                    alt={voice.name}
                    width={size}
                    height={size}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '9999px',
                      display: 'block',
                    }}
                  />
                </button>
              );
            } else {
              return (
                <button
                  key={`${voice.id}-${index}`}
                  onClick={() => onVoiceChange(index)}
                  className="relative transition-all duration-500 ease-out rounded-full overflow-hidden ring-1 ring-offset-1"
                  style={{
                    width: size,
                    height: size,
                    opacity,
                    transform: 'scale(0.6)',
                  }}
                  aria-label={`Select voice ${voice.name}`}
                >
                  <Image
                    src={`/${voice.avatar}`}
                    alt={voice.name}
                    width={size}
                    height={size}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '9999px',
                      display: 'block',
                    }}
                  />
                </button>
              );
            }
          })}
        </div>
      </div>

      <div className="text-center flex flex-col items-center">
        <h4 className="font-semibold text-[#181A1B]">
          {selectedVoiceObj.name}
        </h4>
        <p className="text-xs text-[#39594D] mt-1">
          {selectedVoiceObj.description}
        </p>
      </div>
    </div>
  );
}
