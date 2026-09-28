import { Capacitor, registerPlugin } from '@capacitor/core'

interface SecureTokenPlugin {
  set(options: { value: string }): Promise<void>
  get(): Promise<{ value: string | null }>
  clear(): Promise<void>
}

const SecureToken = registerPlugin<SecureTokenPlugin>('SecureToken')

export function usaAlmacenSeguro() {
  return Capacitor.getPlatform() === 'android'
}

export async function guardarTokenSeguro(value: string) {
  await SecureToken.set({ value })
  const read = await SecureToken.get()
  if (read.value !== value) {
    await SecureToken.clear().catch(() => undefined)
    throw new Error('No se pudo verificar el almacén seguro.')
  }
}

export async function leerTokenSeguro() {
  const read = await SecureToken.get()
  return read.value?.trim() ? read.value : null
}

export async function borrarTokenSeguro() {
  await SecureToken.clear()
}
