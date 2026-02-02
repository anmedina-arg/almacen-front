'use client';

import { useUser } from '../stores/authStore';

export function UserAvatar() {
  const user = useUser();

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-medium text-sm">
        {initials}
      </div>
      <span className="text-sm font-medium hidden sm:inline">{displayName}</span>
    </div>
  );
}
