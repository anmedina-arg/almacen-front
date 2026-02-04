import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  // Verifica si estamos en el navegador (DOMPurify requiere DOM)
  if (typeof window === 'undefined') {
    // En servidor, solo elimina tags HTML básicos
    return input.replace(/<[^>]*>/g, '');
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeUserProfile(profile: { fullName?: string; bio?: string }) {
  return {
    fullName: profile.fullName ? sanitizeInput(profile.fullName) : undefined,
    bio: profile.bio ? sanitizeInput(profile.bio) : undefined,
  };
}
