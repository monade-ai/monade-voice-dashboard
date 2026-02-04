'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AICampaignsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/campaigns');
  }, [router]);

  return null;
}
