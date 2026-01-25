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
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  } else {
    console.warn('Google Analytics not initialized');
  }
};

/**
 * Track PWA installation
 */
export const trackPWAInstall = () => {
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone'
    : 'browser';

  sendGAEvent('pwa_install', {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent,
    display_mode: displayMode,
    platform: navigator.platform,
  });
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
