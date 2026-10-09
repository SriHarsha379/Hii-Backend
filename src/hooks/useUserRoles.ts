import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/apiConfig';

export function useUserRoles(userIds: string[]) {
  const { token } = useAuth();
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ['user-roles', ids],
    enabled: Boolean(token) && ids.length > 0,
    queryFn: async (): Promise<Record<string, string[]>> => {
      const res = await fetch(`${API_BASE}/user-roles/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) return {};
      const json = await res.json();
      return json.data ?? {};
    },
  });
}
