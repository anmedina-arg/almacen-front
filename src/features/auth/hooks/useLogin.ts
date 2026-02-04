import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';
import { authKeys } from '../constants/queryKeys';
import type { LoginCredentials } from '../types/auth.types';

export function useLogin() {
  const queryClient = useQueryClient();
  const store = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),

    onMutate: () => {
      store.setLoading(true);
    },

    onSuccess: (data) => {
      if (data.user && data.session) {
        store.login(data.user, data.session);
        queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      }
    },

    onError: (error) => {
      store.setLoading(false);
      console.error('Login error:', error);
    },

    onSettled: () => {
      store.setLoading(false);
    },
  });
}
