import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';

export function useGoogleAuth() {
  return useMutation({
    mutationFn: () => authService.signInWithGoogle(),
    // Google OAuth redirige, así que no hay onSuccess necesario
  });
}
