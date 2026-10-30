import { Preferences } from '@capacitor/preferences'

const MODO_SIMPLE_KEY = 'gelia:mobile:modo-simple'
const MODO_KIOSCO_KEY = 'gelia:mobile:kiosco'
const LOGIN_RECORDADO_KEY = 'gelia:mobile:login-recordado'

async function leerMarca(key: string) {
  try {
    const stored = await Preferences.get({ key })
    return stored.value === '1'
  } catch {
    return false
  }
}

async function guardarMarca(key: string, activa: boolean) {
  await Preferences.set({ key, value: activa ? '1' : '0' })
}

export function leerModoSimple() {
  return leerMarca(MODO_SIMPLE_KEY)
}

export function guardarModoSimple(activa: boolean) {
  return guardarMarca(MODO_SIMPLE_KEY, activa)
}

export function leerModoKiosco() {
  return leerMarca(MODO_KIOSCO_KEY)
}

export function guardarModoKiosco(activa: boolean) {
  return guardarMarca(MODO_KIOSCO_KEY, activa)
}

export async function leerLoginRecordado() {
  try {
    const stored = await Preferences.get({ key: LOGIN_RECORDADO_KEY })
    return stored.value?.trim() ?? ''
  } catch {
    return ''
  }
}

export async function guardarLoginRecordado(login: string) {
  const value = login.trim()
  if (!value) return
  await Preferences.set({ key: LOGIN_RECORDADO_KEY, value })
}
