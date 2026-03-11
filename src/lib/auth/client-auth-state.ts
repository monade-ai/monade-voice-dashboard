const AUTH_LOCAL_STORAGE_KEYS = [
  'monade_pending_onboarding',
  'monade_onboarding_completed',
];

export function clearClientAuthState() {
  if (typeof window === 'undefined') return;
  for (const key of AUTH_LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
