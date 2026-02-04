export function getAuthErrorMessage(error: unknown): string {
  const message = (error as Error)?.message || '';
  // const code = (error as { code?: string })?.code || '';

  // Mapeo de errores comunes de Supabase
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'User already registered': 'Este email ya está registrado',
    'Email not confirmed': 'Por favor confirma tu email',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Signup requires a valid password': 'La contraseña no es válida',
    'User not found': 'Email o contraseña incorrectos', // No revelar si el usuario existe
    'Invalid email': 'Email inválido',
    'Email rate limit exceeded': 'Demasiados intentos. Intenta más tarde',
    'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, espera 60 segundos antes de reintentar',
  };

  // Buscar por mensaje exacto
  if (errorMap[message]) {
    return errorMap[message];
  }

  // Buscar por mensaje parcial
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return value;
    }
  }

  // Mensaje genérico para errores no mapeados
  return 'Error al autenticar. Intenta nuevamente';
}
