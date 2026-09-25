import { Capacitor } from '@capacitor/core'
import { CapacitorPasskey } from '@capgo/capacitor-passkey'

let bootstrapPromise: Promise<void> | null = null

export function passkeyRelyingPartyOrigin(): string {
  const configured = import.meta.env.VITE_GELIA_ASSETS_URL?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // Continúa con el valor por defecto de producción.
    }
  }
  return 'https://gelianv.neobash.site'
}

export async function ensurePasskeyBootstrap(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!bootstrapPromise) {
    bootstrapPromise = CapacitorPasskey.autoShimWebAuthn({
      origin: passkeyRelyingPartyOrigin(),
    }).then(() => undefined)
  }
  await bootstrapPromise
}
