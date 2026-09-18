import type { ClienteMovil } from './cliente.types'

const CLIENTES_KEY = 'gelia:mobile:clientes:v1'

export function buscarClienteLocal(numeroCliente: string): ClienteMovil | null {
  try {
    const raw = localStorage.getItem(CLIENTES_KEY)
    if (!raw) return null
    const clientes = JSON.parse(raw) as ClienteMovil[]
    return clientes.find((cliente) => String(cliente.numero_cliente) === numeroCliente) ?? null
  } catch {
    return null
  }
}

export function hayCatalogoLocal() {
  return localStorage.getItem(CLIENTES_KEY) !== null
}
