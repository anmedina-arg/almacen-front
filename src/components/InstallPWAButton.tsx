'use client';

import React, { useState, useEffect } from 'react';
import {
  trackPWAInstall,
  trackPWAPromptShown,
  trackPWAInstallAccepted,
  trackPWAInstallDismissed,
} from '@/utils/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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

    // Mostrar tooltip después de 2 segundos
    setTimeout(() => {
      setShowTooltip(true);
    }, 2000);

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
    setShowTooltip(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowButton(false);
    setShowTooltip(false);
    // Track que el usuario descartó el botón
    trackPWAInstallDismissed('button_dismissed');
  };

  if (!showButton) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="relative group">
        <button
          onClick={handleInstallClick}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl transition-all duration-300"
          aria-label="Instalar aplicación"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>

        {/* Botón de cerrar pequeño - fuera del botón principal */}
        <button
          onClick={handleDismiss}
          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity opacity-0 group-hover:opacity-100"
          aria-label="Descartar instalación"
        >
          ✕
        </button>

        {/* Tooltip informativo */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-90 animate-fade-in">
            <div className="flex items-center gap-2">
              <span>📱 Instalar aplicación</span>
            </div>
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPWAButton;
