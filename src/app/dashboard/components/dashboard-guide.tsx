'use client';

import React from 'react';
import { PageGuide } from '@/components/page-guide';

export function DashboardGuide() {
  return (
    <PageGuide
      storageKey="monade_dashboard_guide_dismissed"
      title="Mission Control"
      subtitle="Your command center for everything happening right now. See what's working, spot the hot leads, and take action fast."
      steps={[
        {
          label: 'See the big picture',
          description: 'Check active agents, total conversations, and your credit balance at a glance.',
        },
        {
          label: 'Find the gems',
          description: 'Filter through leads by outcome, quality, and engagement. Spot the opportunities worth your time.',
        },
        {
          label: 'Move fast',
          description: 'Export data, dive into call details, and follow up on hot leads before they go cold.',
        },
      ]}
    />
  );
}

export default DashboardGuide;
