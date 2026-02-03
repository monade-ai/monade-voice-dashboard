/**
 * Campaign localStorage helpers
 * Stores client-only campaign config (assistant/trunk) until backend supports it.
 */

export interface CampaignLocalConfig {
  campaignId: string;
  assistantId: string;
  trunkName: string;
  provider?: string;
  updatedAt: string;
}

const CONFIG_PREFIX = 'campaign_local_config_';
const CONTACTS_PREFIX = 'campaign_contacts_';

export function getCampaignConfigKey(campaignId: string): string {
  return `${CONFIG_PREFIX}${campaignId}`;
}

export function saveCampaignConfig(config: CampaignLocalConfig): void {
  const key = getCampaignConfigKey(config.campaignId);
  localStorage.setItem(key, JSON.stringify(config));
}

export function loadCampaignConfig(campaignId: string): CampaignLocalConfig | null {
  const key = getCampaignConfigKey(campaignId);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CampaignLocalConfig;
  } catch {
    return null;
  }
}

export function deleteCampaignConfig(campaignId: string): void {
  const key = getCampaignConfigKey(campaignId);
  localStorage.removeItem(key);
}

export function saveCampaignContacts(campaignId: string, contacts: unknown[]): boolean {
  const key = `${CONTACTS_PREFIX}${campaignId}`;
  try {
    sessionStorage.setItem(key, JSON.stringify(contacts));
    return true;
  } catch {
    return false;
  }
}

export function loadCampaignContacts<T = unknown>(campaignId: string): T[] | null {
  const key = `${CONTACTS_PREFIX}${campaignId}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return null;
  }
}

export function deleteCampaignContacts(campaignId: string): void {
  const key = `${CONTACTS_PREFIX}${campaignId}`;
  sessionStorage.removeItem(key);
}
