import { useAuthStore, useUser, useIsAuthenticated, useAuthLoading } from '../stores/authStore';

/**
 * Hook principal para acceder al estado de autenticación
 * Wrapper sobre el Zustand store para una API más limpia
 */
export function useAuth() {
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const store = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized: store.isInitialized,
    session: store.session,
  };
}
