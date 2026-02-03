'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-200 group cursor-pointer flex-1 min-w-[180px]"
    >
      <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
        <Icon className="w-7 h-7 text-amber-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 text-center">{title}</h3>
      {description && (
        <p className="text-xs text-gray-400 text-center mt-1 leading-relaxed">{description}</p>
      )}
    </button>
  );
};

// Feature cards grid - flex for equal width
interface FeatureCardsGridProps {
    features: {
        icon: LucideIcon;
        title: string;
        description?: string;
        onClick?: () => void;
    }[];
}

export const FeatureCardsGrid: React.FC<FeatureCardsGridProps> = ({ features }) => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </div>
  );
};

export default FeatureCard;
