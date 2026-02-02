import { createBrowserClient } from '@supabase/ssr';
import { useAuthStore } from '../stores/authStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export async function syncSupabaseSession() {
  const store = useAuthStore.getState();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Session sync error:', error);
    store.logout();
    return;
  }

  if (session) {
    store.login(session.user, session);
  } else {
    store.logout();
  }

  store.setInitialized(true);
}

export function setupAuthListener() {
  const store = useAuthStore.getState();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth state changed:', event);

      if (session) {
        store.login(session.user, session);
      } else {
        store.logout();
      }
    }
  );

  return () => subscription.unsubscribe();
}
