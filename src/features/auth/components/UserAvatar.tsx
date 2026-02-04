'use client';

import { useUser } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabaseBrowser } from '@/lib/supabase/client';
import Image from 'next/image';

export function UserAvatar() {
  const user = useUser();

  // Fetch profile data from profiles table
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabaseBrowser
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (!user) return null;

  // Priorizar datos de profile table, luego user_metadata
  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Usuario';

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        <div className="w-8 h-8 rounded-full overflow-hidden relative">
          <Image
            src={avatarUrl}
            alt={displayName}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-medium text-sm">
          {initials}
        </div>
      )}
      <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
    </div>
  );
}
