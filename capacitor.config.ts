import type { CapacitorConfig } from '@capacitor/cli';

function passkeyOriginFromEnv(): string {
  const configured = process.env.VITE_GELIA_ASSETS_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Valor por defecto de producción.
    }
  }
  return 'https://gelianv.neobash.site';
}

const passkeyOrigin = passkeyOriginFromEnv();
const passkeyHostname = new URL(passkeyOrigin).hostname;

const config: CapacitorConfig = {
  appId: 'mx.neobash.gelianv',
  appName: 'gelia-nv',
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
