import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton';
import {
  getPlatformAdminSession,
  PLATFORM_ADMIN_CALLBACK,
  safePlatformAdminRedirect,
} from '@/features/auth/utils/platformAdmin';

export const metadata: Metadata = {
  title: 'Ingresar · Panel de plataforma',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Login propio del Platform admin (#194, ADR-0015). Sin registro: el rol
 * super_admin se asigna en la base, nunca desde un formulario. Con sesión de
 * super_admin ya activa, va directo al panel.
 */
export default async function PlatformAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  const destination = safePlatformAdminRedirect(redirectTo);

  const supabase = await createSupabaseServerClient();
  const { user, isSuperAdmin } = await getPlatformAdminSession(supabase);
  if (isSuperAdmin) redirect(destination);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Panel de plataforma</h1>
          <p className="text-gray-600">Ingresá con tu cuenta de administrador de chaskyapp</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {user && (
            <div className="rounded-md bg-amber-50 p-3 border-l-4 border-amber-500">
              <p className="text-sm text-amber-900">
                La sesión actual ({user.email}) no tiene acceso al panel de plataforma. Ingresá con
                otra cuenta.
              </p>
            </div>
          )}
          {error === 'callback_failed' && (
            <div className="rounded-md bg-red-50 p-3 border-l-4 border-red-500">
              <p className="text-sm text-red-800">
                No se pudo completar el ingreso con Google. Probá de nuevo.
              </p>
            </div>
          )}

          <LoginForm redirectTo={destination} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O continuá con</span>
            </div>
          </div>

          <GoogleAuthButton callbackPath={PLATFORM_ADMIN_CALLBACK} />
        </div>
      </div>
    </main>
  );
}
