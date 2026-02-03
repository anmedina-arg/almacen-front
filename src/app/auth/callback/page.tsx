'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = supabaseBrowser;

      // Obtener el código de OAuth de la URL
      const code = searchParams.get('code');

      if (code) {
        // Intercambiar código por sesión
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('Auth callback error:', error);
          router.push('/login?error=callback_failed');
          return;
        }
      }

      // Redirigir a home después de auth exitoso
      router.push('/');
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Completando autenticación...</p>
      </div>
    </div>
  );
}
