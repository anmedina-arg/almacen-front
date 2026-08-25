'use client';

import { createContext, useContext } from 'react';
import type { FeatureFlags } from '@/lib/store/featureFlags';

const FeatureFlagsContext = createContext<FeatureFlags | null>(null);

/**
 * Provee las feature flags de la Store activa (#23), resueltas server-side
 * en [store]/admin/layout.tsx y pasadas acá como prop — ningún client
 * component vuelve a pedirlas por su cuenta.
 */
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags;
  children: React.ReactNode;
}) {
  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlags {
  const flags = useContext(FeatureFlagsContext);
  if (!flags) {
    throw new Error('useFeatureFlags debe usarse dentro de un FeatureFlagsProvider');
  }
  return flags;
}
