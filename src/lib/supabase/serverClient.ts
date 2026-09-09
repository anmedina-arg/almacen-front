import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components and API Routes.
 * Handles cookie management for authentication state.
 *
 * Separada de server.ts (#144, spec #139) a propósito: server.ts también
 * exporta supabaseServer, un singleton creado al cargar el módulo — algo
 * que un módulo test-safe (ej. roleHelpers.ts) no puede importar sin
 * arrastrar esa creación eager (tira "supabaseUrl is required" en test,
 * donde esas env vars de producción no están seteadas). Esta función en
 * su propio archivo, sin ningún side-effect de módulo, es segura de
 * importar desde cualquier lado.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
            // Cookies can only be modified in Route Handlers
          }
        },
      },
    }
  );
}
