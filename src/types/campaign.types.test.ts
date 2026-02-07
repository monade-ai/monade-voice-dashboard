import { getCampaignProgress } from '@/types/campaign.types';

describe('getCampaignProgress', () => {
  test('uses monitoring stats when available', () => {
    const campaign = {
      status: 'active' as const,
      total_contacts: 3,
      successful_calls: 0,
      failed_calls: 0,
    };
    const stats = {
      pending_contacts: 1,
      in_progress_contacts: 1,
      completed_contacts: 1,
      failed_contacts: 1,
    };

    const progress = getCampaignProgress(campaign, stats);

    expect(progress.total).toBe(3);
    expect(progress.processed).toBe(2);
    expect(progress.pending).toBe(1);
    expect(progress.inProgress).toBe(1);
    expect(progress.percent).toBe(67);
    expect(progress.statusLabel).toBe('Dialing');
  });

  test('completed campaigns are 100%', () => {
    const campaign = {
      status: 'completed' as const,
      total_contacts: 10,
      successful_calls: 9,
      failed_calls: 1,
    };

    const progress = getCampaignProgress(campaign);
    expect(progress.percent).toBe(100);
  });
});

