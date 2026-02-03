import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuthStore } from '../stores/authStore';

const supabase = supabaseBrowser;

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
