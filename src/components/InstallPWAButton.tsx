'use client';

import { useState, useEffect } from 'react';
import { headerActionClass } from './headerAction';
import {
  trackPWAPromptShown,
  trackPWAInstallAccepted,
  trackPWAInstallDismissed,
} from '@/utils/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Acción "Instalar" del encabezado del catálogo (#173). Antes era un botón
 * flotante azul con globo de texto montado en el layout raíz; ahora vive solo
 * en el encabezado del catálogo. Las condiciones para mostrarse son las mismas
 * (no instalada y no descartada antes). Ya no hay botón para descartarla desde
 * la pantalla, así que el evento 'button_dismissed' dejó de generarse; el
 * rechazo del aviso del navegador ('user_rejected') se sigue registrando.
 */
export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    console.log('[PWA Button] InstallPWAButton component mounted');

    // Verificar si ya está instalada o si el usuario rechazó la instalación
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const userDismissed = localStorage.getItem('pwa-install-dismissed');
    const userInstalled = localStorage.getItem('pwa-installed');

    console.log('[PWA Button] Is installed (standalone):', isInstalled);
    console.log('[PWA Button] User dismissed:', userDismissed);
    console.log('[PWA Button] User installed (localStorage):', userInstalled);

    // Si ya está instalada o fue rechazada, no mostrar el botón
    if (isInstalled || userDismissed || userInstalled) {
      console.log('[PWA Button] Hiding button - already installed or dismissed');
      setShowButton(false);
      return;
    }

    // Mostrar el botón siempre (no depender del evento)
    console.log('[PWA Button] Showing install button');
    setShowButton(true);

    // Escuchar el evento beforeinstallprompt para capturar el prompt
    const beforeInstallHandler = (e: Event) => {
      console.log('[PWA Button] beforeinstallprompt event detected');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Track que el prompt está disponible
      console.log('[PWA Button] Calling trackPWAPromptShown');
      trackPWAPromptShown();
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    console.log('[PWA Button] beforeinstallprompt listener registered');

    return () => {
      console.log('[PWA Button] Removing beforeinstallprompt listener');
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('[PWA Button] Install button clicked');
    console.log('[PWA Button] Deferred prompt available:', !!deferredPrompt);

    if (!deferredPrompt) {
      // Si no hay prompt disponible, informar al usuario
      console.warn('[PWA Button] No deferred prompt available');
      alert('La instalación no está disponible en este momento. Intenta desde Chrome, Edge o Safari.');
      return;
    }

    // Mostrar el prompt de instalación
    console.log('[PWA Button] Showing install prompt...');
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    console.log('[PWA Button] Waiting for user choice...');
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA Button] User choice outcome:', outcome);

    if (outcome === 'accepted') {
      console.log('[PWA Button] ✅ User ACCEPTED installation');
      localStorage.setItem('pwa-installed', 'true');
      // Track aceptación (la instalación real se trackea en PWAInstallTracker)
      console.log('[PWA Button] Calling trackPWAInstallAccepted');
      trackPWAInstallAccepted();
      console.log('[PWA Button] Note: Actual installation will be tracked by PWAInstallTracker');
    } else {
      console.log('[PWA Button] ❌ User REJECTED installation');
      localStorage.setItem('pwa-install-dismissed', 'true');
      // Track rechazo
      console.log('[PWA Button] Calling trackPWAInstallDismissed');
      trackPWAInstallDismissed('user_rejected');
    }

    // Limpiar el prompt
    setDeferredPrompt(null);
    setShowButton(false);
  };

  if (!showButton) return null;

  return (
    <button type="button" onClick={handleInstallClick} className={headerActionClass}>
      Instalar
    </button>
  );
}
