import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import { Organization, OrganizationMember, UserProfile } from '@/types';

const supabase = createClientComponentClient();

async function fetchCurrentSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null, organization: null, role: null, permissions: {} };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.current_organization_id) {
    return { user, profile, organization: null, role: null, permissions: {} };
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.current_organization_id)
    .single();

  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', profile.current_organization_id)
    .eq('user_id', user.id)
    .single();

  const role = member?.role;
  const permissions = {
    canInviteMembers: role === 'admin' || role === 'owner',
    canDeleteOrganization: role === 'owner',
    canEditSettings: role === 'admin' || role === 'owner',
  };

  return { user, profile, organization, role, permissions };
}

export function useCurrentSession() {
  return useQuery({
    queryKey: ['current-session'],
    queryFn: fetchCurrentSession,
  });
}
