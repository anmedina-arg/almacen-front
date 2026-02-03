import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function verifyAdminAuth(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  error: string | null;
}> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can't modify cookies in some contexts
          }
        },
      },
    }
  );

  // Verificar sesión
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return { isAdmin: false, userId: null, error: 'No authenticated' };
  }

  // Obtener perfil del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, userId: session.user.id, error: 'Profile not found' };
  }

  return {
    isAdmin: profile.role === 'admin',
    userId: session.user.id,
    error: null,
  };
}

export function hasRole(user: unknown, role: 'admin' | 'user'): boolean {
  const userObj = user as { user_metadata?: { role?: string }; role?: string } | null;
  return userObj?.user_metadata?.role === role || userObj?.role === role;
}

export function isAdmin(user: unknown): boolean {
  return hasRole(user, 'admin');
}
