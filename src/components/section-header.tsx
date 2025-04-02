// app/dashboard/components/section-header.tsx

import React from 'react';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="flex items-center mb-4 mt-8">
      <h2 className="text-xl font-semibold text-amber-800">{title}</h2>
      <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-amber-200 to-transparent ml-4" />
    </div>
  );
}