import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { authKeys } from '../constants/queryKeys';
import { useIsAuthenticated } from '../stores/authStore';

export function useUserQuery() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated, // Solo fetch si está logueado
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
  });
}
