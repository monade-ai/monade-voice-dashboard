'use client';

import React from 'react';

import {
  Card,
  CardTitle,
} from '@/components/ui/card';
import './auto-scroll.css';

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'warning' | 'success' | 'error';
  actionRequired?: boolean;
}

const cards: CarouselItem[] = [
  {
    id: '1',
    title: 'Agent cold-call-test',
    description: 'High drop-offs. Review recommended.',
    status: 'warning',
    actionRequired: true,
  },
  {
    id: '2',
    title: 'L2 Qualification Leads',
    description: 'Campaign started. Running.',
    status: 'active',
    actionRequired: false,
  },
  {
    id: '3',
    title: 'Outbound - SMB',
    description: 'Call volume spike. Peak hours.',
    status: 'success',
    actionRequired: false,
  },
  {
    id: '4',
    title: 'Demo Requests',
    description: '12 pending. Action required.',
    status: 'warning',
    actionRequired: true,
  },
  {
    id: '5',
    title: 'Voicebot - Feedback',
    description: 'Positive trend. On track.',
    status: 'success',
    actionRequired: false,
  },
];

interface ActivityCarouselProps {
  items?: CarouselItem[];
  autoScrollSpeed?: number;
}

export default function AutoScrollCarousel({ 
  items = cards, 
  autoScrollSpeed = 35000, 
}: ActivityCarouselProps) {
  // Duplicate cards for seamless infinite scroll
  const carouselItems = [...items, ...items];

  const getStatusColor = (status: CarouselItem['status']) => {
    switch (status) {
    case 'active':
      return 'border-blue-500 bg-blue-500/10';
    case 'warning':
      return 'border-yellow-500 bg-yellow-500/10';
    case 'success':
      return 'border-green-500 bg-green-500/10';
    case 'error':
      return 'border-red-500 bg-red-500/10';
    default:
      return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIndicator = (status: CarouselItem['status']) => {
    switch (status) {
    case 'active':
      return <div className="w-2 h-2 rounded-full bg-blue-500" />;
    case 'warning':
      return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
    case 'success':
      return <div className="w-2 h-2 rounded-full bg-green-500" />;
    case 'error':
      return <div className="w-2 h-2 rounded-full bg-red-500" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-gray-500" />;
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="auto-scroll-container">
        {/* Top and bottom fade overlays */}
        <div className="auto-scroll-fade top" />
        <div className="auto-scroll-fade bottom" />
        <div 
          className="auto-scroll-content flex flex-col"
          style={{ 
            animationDuration: `${autoScrollSpeed}ms`, 
          }}
        >
          {carouselItems.map((card, idx) => (
            <div key={`${card.id}-${idx}`} className="w-full px-3 mb-2">
              <Card
                className={`w-full rounded-lg shadow-md border h-24 flex flex-col justify-between p-3 transition-all duration-200 hover:shadow-lg ${getStatusColor(card.status)} bg-card`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIndicator(card.status)}
                      <CardTitle className="text-sm font-semibold text-foreground truncate">
                        {card.title}
                      </CardTitle>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {card.description}
                    </div>
                  </div>
                  {card.actionRequired && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
