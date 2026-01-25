'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    console.log('[GA4 Debug] GoogleAnalytics component mounted');
    console.log('[GA4 Debug] Measurement ID:', measurementId);
  }, [measurementId]);

  if (!measurementId) {
    console.warn('[GA4 Debug] No measurement ID found in environment variables');
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[GA4 Debug] Google Analytics script loaded successfully');
          console.log('[GA4 Debug] window.gtag available:', typeof window.gtag !== 'undefined');
        }}
        onError={(e) => {
          console.error('[GA4 Debug] Error loading Google Analytics script:', e);
        }}
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          console.log('[GA4 Debug] Initializing Google Analytics...');
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
          console.log('[GA4 Debug] Google Analytics initialized with ID: ${measurementId}');
        `}
      </Script>
    </>
  );
}
