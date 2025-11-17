'use client';

import { useEffect, useState } from 'react';

export default function ArtisticBranding() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Images from public/login directory
  const images = [
    {
      url: '/login/Group 1.png',
      title: 'AI Voice Technology',
      subtitle: 'Advanced conversation intelligence'
    },
    {
      url: '/login/WhatsApp Image 2025-07-16 at 23.12.13 (1).jpeg',
      title: 'Smart Communication',
      subtitle: 'Seamless voice interactions'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        setIsTransitioning(false);
      }, 800); // Longer transition for smoother effect
    }, 8000); // Slow refresh every 8 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      {/* Full Screen Image Carousel */}
      <div className="absolute inset-0">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
              index === currentImageIndex
                ? isTransitioning
                  ? 'opacity-0 blur-md scale-105'
                  : 'opacity-100 blur-none scale-100'
                : 'opacity-0 blur-lg scale-95'
            }`}
          >
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${image.url})`,
                filter: isTransitioning && index === currentImageIndex 
                  ? 'blur(12px) brightness(0.7)' 
                  : 'blur(0px) brightness(0.6)'
              }}
            />
            
            {/* Subtle gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
          </div>
        ))}
      </div>

      {/* Minimal Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-12 text-center">
        {/* Clean Branding */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4 tracking-wide drop-shadow-lg">
            MONADE
          </h1>
          <div className="h-0.5 w-24 bg-white/80 mx-auto mb-6" />
          <p className="text-xl text-white/90 font-light tracking-wider drop-shadow">
            Voice Intelligence Platform
          </p>
        </div>

        {/* Dynamic Content - Subtle */}
        <div className="mb-8">
          <div
            className={`transition-all duration-700 ${
              isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
            }`}
          >
            <h2 className="text-2xl font-medium text-white/90 mb-2 drop-shadow">
              {images[currentImageIndex].title}
            </h2>
            <p className="text-lg text-white/70 drop-shadow">
              {images[currentImageIndex].subtitle}
            </p>
          </div>
        </div>

        {/* Minimal floating accent */}
        <div className="absolute top-8 right-8 w-8 h-8 border border-white/20 rounded-full" />
        <div className="absolute bottom-8 left-8 w-6 h-6 bg-white/10 rounded" />
      </div>

      {/* Smooth transition overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm z-5 transition-opacity duration-700" />
      )}
    </div>
  );
}