export interface ClienteMovil {
  id: number
  numero_cliente: string
  nombre: string
  nombre_razon_social?: string | null
  rfc?: string | null
  lista_descuento?: string | null
  vendedor?: string | null
  tipo_cliente?: string | null
  es_inactivo?: boolean
  es_heredado?: boolean
  lista_bloqueada?: boolean
  alcance?: string
  [key: string]: unknown
}
