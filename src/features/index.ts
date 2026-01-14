import { instanceConfig } from '@/config';

export const isBackendEnabled = () => instanceConfig.features.backend;

export const isStockEnabled = () => instanceConfig.features.stock;

export const isVariantsEnabled = () => instanceConfig.features.variants;

export const isPwaEnabled = () => instanceConfig.features.pwa;
