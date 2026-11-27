import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';

export function useGoogleAuth(callbackPath?: string) {
  return useMutation({
    mutationFn: () => authService.signInWithGoogle(callbackPath),
    // Google OAuth redirige, así que no hay onSuccess necesario
  });
}
