export type ResguardoBandeja = 'por_recibir' | 'en_custodia' | 'incidencias'
export type ResguardoPaso = 'gerente' | 'recepcionista'

export interface ResguardoCliente {
  id: number
  numero_cliente: string
  nombre: string
}

export interface ResguardoSucursal {
  id: number
  nombre: string
}

export interface ResguardoPedido {
  id: number
  folio: string | null
  folio_remision: string | null
}

export interface ResguardoListItem {
  id: number
  version: number
  estado: string
  estado_etiqueta: string
  pedido_bma_id?: number | null
  snapshot_folio?: string | null
  snapshot_cliente_nombre?: string | null
  etiqueta_retiro?: string | null
  cantidad_bultos_esperada: number
  cantidad_bultos_recibida: number
  cantidad_bultos_pendiente: number
  cantidad_bultos_en_custodia?: number
  cantidad_bultos_pendiente_custodia?: number
  admite_recepcion: boolean
  admite_pasar_a_recepcion: boolean
  admite_confirmacion_custodia?: boolean
  recepcion_completa: boolean
  custodia_completa?: boolean
  puede_recibir?: boolean
  puede_pasar_a_recepcion?: boolean
  salida_cedis_at?: string | null
  recepcion_fisica_at?: string | null
  custodia_confirmada_at?: string | null
  vencido_repuesto_at?: string | null
  entrega_bloqueada?: boolean
  incidencias_abiertas_count: number
  clasificaciones?: Record<string, boolean>
  clasificaciones_etiquetas: string[]
  fecha_limite_custodia?: string | null
  fecha_limite_rezago?: string | null
  sucursal: ResguardoSucursal | null
  cliente: ResguardoCliente | null
  pedido: ResguardoPedido | null
}

export interface LaravelPaginator<T> {
  current_page: number
  data: T[]
  last_page: number
  per_page: number
  total: number
}

export interface ResguardoListResponse {
  bandeja: ResguardoBandeja
  resguardos: LaravelPaginator<ResguardoListItem>
  metricas: Record<string, number>
  filtros: Record<string, unknown>
}

export interface ResguardoBulto {
  id: number
  folio: string
  codigo_etiqueta?: string | null
  tipo?: string | null
  estado?: string | null
  recepcion_at?: string | null
  entrega_at?: string | null
}

export interface ResguardoArchivo {
  id: number
  uso?: string | null
  tipo?: string | null
  nombre_original?: string | null
  mime_type?: string | null
  ruta_publica?: string | null
  url?: string | null
}

export interface ResguardoPiezaManual {
  producto_id: number
  sku?: string | null
  descripcion?: string | null
  cantidad: number
}

export interface ResguardoRegistroManual {
  cantidad_piezas?: number | null
  piezas?: ResguardoPiezaManual[]
  evidencias?: ResguardoArchivo[]
}

export interface ResguardoDocumentoPedido {
  id: number
  tipo?: string | null
  url?: string | null
  nombre_original?: string | null
  mime_type?: string | null
  relacion_tipo?: string | null
  relacion_id?: number | string | null
}

export interface ResguardoRevisionProducto {
  id: number
  descripcion_producto?: string | null
  sku?: string | null
  unica_pieza?: boolean
}

export interface ResguardoPedidoRevision {
  revisiones_producto?: ResguardoRevisionProducto[]
  documentos?: ResguardoDocumentoPedido[]
}

export interface ResguardoBultoEmpaque {
  numero: number
  foto_bulto?: ResguardoArchivo | null
  foto_ticket?: ResguardoArchivo | null
}

export interface ResguardoDetalle extends ResguardoListItem {
  referencia_cliente?: string
  envia_a_otra_persona?: boolean
  envia_otra_persona?: string | null
  entrega_completada_at?: string | null
  devolucion_confirmada_at?: string | null
  cancelacion_recibida?: boolean
  bultos: ResguardoBulto[]
  incidencias: Array<Record<string, unknown>>
  registro_manual?: ResguardoRegistroManual | null
  pedido_revision?: ResguardoPedidoRevision | null
  bultos_empaque_cedis?: ResguardoBultoEmpaque[]
}

export interface ResguardoTimelineItem {
  id: string
  tipo_evento?: string
  tipo_etiqueta?: string
  categoria?: string
  estado_anterior_etiqueta?: string | null
  estado_nuevo_etiqueta?: string | null
  ocurrido_at?: string | null
  actor_referencia?: string | null
  bulto_folio?: string | null
  metadata_legible?: Record<string, unknown> | null
  evidencias?: ResguardoArchivo[]
}

export interface ResguardoDetalleResponse {
  resguardo: ResguardoDetalle
  timeline: ResguardoTimelineItem[]
}

export interface ResguardoEntregaInput {
  relacion: 'titular' | 'tercero'
  nombreQuienRetira: string
  observaciones?: string
  firma: Blob
  fotoPaqueteAbierto: File
  bultoIds?: number[]
}

export interface ProductoResguardo {
  id: number
  sku: string | null
  descripcion: string | null
  folio: string | null
  codigo_barras: string | null
}

export interface AltaResguardoPieza {
  productoId: number
  cantidad: number
  etiqueta: string
}

export interface ResguardoAlmacenCustodia {
  id: number
  codigo: string
  nombre: string
}

export interface ResguardoBultoPendienteCustodia {
  id: number
  folio: string
  tipo?: string | null
  piezas?: number
  condicion?: string | null
}

export interface ResguardoCustodiaFormResguardo {
  id: number
  version: number
  estado: string
  estado_etiqueta: string
  snapshot_folio?: string | null
  snapshot_cliente_nombre?: string | null
  etiqueta_retiro?: string | null
  bultos_pendientes_custodia: ResguardoBultoPendienteCustodia[]
}

export interface ResguardoCustodiaFormResponse {
  resguardo: ResguardoCustodiaFormResguardo
  almacenes: ResguardoAlmacenCustodia[]
  catalogos: {
    estados?: Record<string, string>
    tipos_bulto?: Record<string, string>
    condiciones_bulto?: Record<string, string>
  }
  admite_confirmacion_custodia: boolean
  motivo_no_confirmacion_custodia?: string | null
}

export interface ConfirmarCustodiaBultoInput {
  folio: string
  tipo: string
  condicion: string
  piezas: number
}

export interface ConfirmarCustodiaInput {
  almacenId: number
  bultos: ConfirmarCustodiaBultoInput[]
  evidencias?: File[]
}

export interface AltaResguardoInput {
  clienteId: number
  folio: string
  origenId: number
  cantidadBultos: number
  enviaAOtraPersona: boolean
  enviaOtraPersona?: string
  observaciones?: string
  piezas: AltaResguardoPieza[]
  archivoTicket: File
  fotoPaquete: File
}
