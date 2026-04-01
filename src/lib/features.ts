/**
 * Feature flags — driven by NEXT_PUBLIC_FEATURE_* env vars.
 * Set to "true" to enable a feature, anything else to disable.
 */
export const features = {
  dashboard: process.env.NEXT_PUBLIC_FEATURE_DASHBOARD === 'true',
} as const;
