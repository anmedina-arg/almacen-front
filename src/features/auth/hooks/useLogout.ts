import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

export function useLogout() {
  const queryClient = useQueryClient();
  const store = useAuthStore();

  return useMutation({
    mutationFn: () => authService.logout(),

    onSuccess: () => {
      store.logout();
      queryClient.clear(); // Limpiar todo el cache
    },

    onError: (error) => {
      console.error('Logout error:', error);
    },
  });
}
