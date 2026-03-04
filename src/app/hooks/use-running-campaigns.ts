'use client';

import { useState, useEffect } from 'react';

import { useMonadeUser } from '@/app/hooks/use-monade-user';
import { campaignApi } from '@/lib/services/campaign-api.service';

export function useRunningCampaigns() {
  const { userUid } = useMonadeUser();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!userUid) return;

    campaignApi.list(userUid)
      .then((campaigns) => {
        const running = campaigns.filter((c) => c.status === 'active').length;
        setCount(running);
      })
      .catch(() => {/* silently fail — sidebar badge is non-critical */});
  }, [userUid]);

  return count;
}
