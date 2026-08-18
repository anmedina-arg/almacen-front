'use client';

import { useLogout } from '../hooks/useLogout';
import { useRouter } from 'next/navigation';
import { useStoreSlug } from '@/hooks/useStoreSlug';

export function LogoutButton() {
  const router = useRouter();
  const slug = useStoreSlug();
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push(`/${slug}`);
      },
    });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Saliendo...' : 'Salir'}
    </button>
  );
}
