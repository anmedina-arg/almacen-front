'use client';

import { useEffect } from 'react';
import { syncSupabaseSession, setupAuthListener } from '../services/sessionService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sincronizar sesión al montar
    syncSupabaseSession();

    // Configurar listener de cambios de autenticación
    const unsubscribe = setupAuthListener();

    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}
