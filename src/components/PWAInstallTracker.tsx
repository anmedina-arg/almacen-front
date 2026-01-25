'use client';

import { useEffect } from 'react';
import { trackPWAInstall } from '@/utils/analytics';

/**
 * Component that tracks PWA installation events globally
 * This component should always be mounted to capture the 'appinstalled' event
 */
export default function PWAInstallTracker() {
  useEffect(() => {
    console.log('[PWA Tracker] PWAInstallTracker component mounted');
    console.log('[PWA Tracker] Registering appinstalled event listener');

    const handleAppInstalled = (event: Event) => {
      console.log('[PWA Tracker] ========================================');
      console.log('[PWA Tracker] PWA INSTALLED EVENT DETECTED!');
      console.log('[PWA Tracker] ========================================');
      console.log('[PWA Tracker] Event object:', event);
      console.log('[PWA Tracker] Event type:', event.type);
      console.log('[PWA Tracker] Timestamp:', new Date().toISOString());
      console.log('[PWA Tracker] User agent:', navigator.userAgent);
      console.log('[PWA Tracker] Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
      console.log('[PWA Tracker] Platform:', navigator.platform);

      // Track the installation
      console.log('[PWA Tracker] Calling trackPWAInstall...');
      trackPWAInstall();

      // Store in localStorage
      localStorage.setItem('pwa-installed', 'true');
      localStorage.setItem('pwa-install-timestamp', new Date().toISOString());
      console.log('[PWA Tracker] Saved installation to localStorage');
    };

    // Register the event listener
    window.addEventListener('appinstalled', handleAppInstalled);
    console.log('[PWA Tracker] Event listener registered successfully');

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    console.log('[PWA Tracker] Is PWA installed (standalone mode):', isInstalled);

    return () => {
      console.log('[PWA Tracker] Removing appinstalled event listener');
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
