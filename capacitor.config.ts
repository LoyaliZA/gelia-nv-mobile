import type { CapacitorConfig } from '@capacitor/cli';
import { loadEnv } from 'vite';

// Use the same production .env files and process overrides as vite build.
const productionEnv = loadEnv('production', process.cwd(), 'VITE_');

function passkeyOriginFromEnv(): string {
  const configured = productionEnv.VITE_GELIA_ASSETS_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('VITE_GELIA_ASSETS_URL debe ser una URL HTTPS sin credenciales.');
    }
    return url.origin;
  }
  return 'https://gelianv.neobash.site';
}

const passkeyOrigin = passkeyOriginFromEnv();
const passkeyHostname = new URL(passkeyOrigin).hostname;

const config: CapacitorConfig = {
  appId: 'mx.neobash.gelianv',
  appName: 'Gelia-NV',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorPasskey: {
      origin: passkeyOrigin,
      domains: [passkeyHostname],
      autoShim: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#101217',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
