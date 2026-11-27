import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { PLATFORM_ADMIN_HOME, PLATFORM_ADMIN_LOGIN } from '@/features/auth/utils/platformAdmin';

/**
 * Callback de OAuth del login de plataforma (#194). Vuelve siempre a
 * /admin: un destino variable en la query complicaría el match con las
 * Redirect URLs permitidas de Supabase Auth. El rol lo comprueba /admin.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const failed = () =>
    NextResponse.redirect(`${origin}${PLATFORM_ADMIN_LOGIN}?error=callback_failed`);

  // Sin code: Google canceló o devolvió error (?error=access_denied).
  if (!code) return failed();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[admin] auth callback falló:', error.message);
    return failed();
  }

  return NextResponse.redirect(`${origin}${PLATFORM_ADMIN_HOME}`);
}
