/**
 * Google Analytics 4 Event Tracking Utilities
 */

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Send a custom event to Google Analytics 4
 * @param eventName - Name of the event
 * @param eventParams - Additional parameters for the event
 */
export const sendGAEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>
) => {
  console.log('[GA4 Debug] sendGAEvent called:', eventName, eventParams);
  console.log('[GA4 Debug] window.gtag exists:', typeof window !== 'undefined' && typeof window.gtag !== 'undefined');

  if (typeof window !== 'undefined' && window.gtag) {
    console.log('[GA4 Debug] Sending event to GA4:', eventName);
    window.gtag('event', eventName, eventParams);
    console.log('[GA4 Debug] Event sent successfully');
  } else {
    console.warn('[GA4 Debug] Google Analytics not initialized - event NOT sent:', eventName);
    console.warn('[GA4 Debug] window exists:', typeof window !== 'undefined');
    console.warn('[GA4 Debug] window.gtag exists:', typeof window !== 'undefined' && typeof window.gtag !== 'undefined');
  }
};

/**
 * Track PWA installation
 */
export const trackPWAInstall = () => {
  console.log('[GA4 Debug] trackPWAInstall called');

  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone'
    : 'browser';

  const eventData = {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    display_mode: displayMode,
    platform: navigator.platform,
  };

  console.log('[GA4 Debug] PWA Install event data:', eventData);
  sendGAEvent('pwa_install', eventData);
};

/**
 * Track PWA installation prompt shown
 */
export const trackPWAPromptShown = () => {
  sendGAEvent('pwa_prompt_shown', {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
  });
};

/**
 * Track PWA installation accepted
 */
export const trackPWAInstallAccepted = () => {
  sendGAEvent('pwa_install_accepted', {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
  });
};

/**
 * Track PWA installation dismissed/rejected
 */
export const trackPWAInstallDismissed = (reason: 'user_rejected' | 'button_dismissed') => {
  sendGAEvent('pwa_install_dismissed', {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    reason,
  });
};
