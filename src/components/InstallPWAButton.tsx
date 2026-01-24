'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada o si el usuario rechazó la instalación
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const userDismissed = localStorage.getItem('pwa-install-dismissed');
    const userInstalled = localStorage.getItem('pwa-installed');

    // Si ya está instalada o fue rechazada, no mostrar el botón
    if (isInstalled || userDismissed || userInstalled) {
      setShowButton(false);
      return;
    }

    // Mostrar el botón siempre (no depender del evento)
    setShowButton(true);

    // Mostrar tooltip después de 2 segundos
    setTimeout(() => {
      setShowTooltip(true);
    }, 2000);

    // Escuchar el evento beforeinstallprompt para capturar el prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Si no hay prompt disponible, informar al usuario
      alert('La instalación no está disponible en este momento. Intenta desde Chrome, Edge o Safari.');
      return;
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA instalada exitosamente');
      localStorage.setItem('pwa-installed', 'true');
    } else {
      console.log('Usuario rechazó la instalación');
      localStorage.setItem('pwa-install-dismissed', 'true');
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
