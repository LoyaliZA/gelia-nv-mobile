import type {
  ResguardoArchivo,
  ResguardoDetalle,
  ResguardoTimelineItem,
} from './resguardo.types'

export interface FotoResguardo {
  key: string
  etiqueta: string
  path: string
}

export interface PiezaResguardoVista {
  key: string
  titulo: string
  detalle?: string
  fotos: FotoResguardo[]
}

export interface ContenidoResguardoVista {
  paquetes: FotoResguardo[]
  tickets: FotoResguardo[]
  piezas: PiezaResguardoVista[]
}

const EVENTOS_ENTREGA = [
  'resguardo.entrega_titular',
  'resguardo.entrega_tercero',
  'resguardo.entrega_multiple',
  'resguardo.entrega_parcial',
]

export function rutaEvidenciaResguardo(resguardoId: number, evidenciaId: number) {
  return `/mobile/punto-venta/resguardos/${resguardoId}/archivos/evidencias/${evidenciaId}`
}

export function rutaDocumentoResguardo(resguardoId: number, documentoId: number) {
  return `/mobile/punto-venta/resguardos/${resguardoId}/archivos/documentos/${documentoId}`
}

function idDocumento(archivo?: ResguardoArchivo | null) {
  if (archivo?.id) return archivo.id
  const url = archivo?.url || archivo?.ruta_publica
  const match = url?.match(/\/documentos\/(\d+)(?:\?|$)/)
  return match ? Number(match[1]) : null
}

function esImagen(archivo?: ResguardoArchivo | null) {
  const mime = archivo?.mime_type?.toLowerCase() ?? ''
  if (!mime) return true
  return mime.startsWith('image/')
}

export function contenidoResguardo(resguardo: ResguardoDetalle): ContenidoResguardoVista {
  const paquetes: FotoResguardo[] = []
  const tickets: FotoResguardo[] = []
  const piezas: PiezaResguardoVista[] = []

  resguardo.bultos_empaque_cedis?.forEach((bulto) => {
    const fotoPaquete = idDocumento(bulto.foto_bulto)
    if (fotoPaquete && esImagen(bulto.foto_bulto)) {
      paquetes.push({
        key: `bulto-paquete-${fotoPaquete}`,
        etiqueta: resguardo.bultos_empaque_cedis && resguardo.bultos_empaque_cedis.length > 1
          ? `Paquete ${bulto.numero}`
          : 'Paquete',
        path: rutaDocumentoResguardo(resguardo.id, fotoPaquete),
      })
    }
    const fotoTicket = idDocumento(bulto.foto_ticket)
    if (fotoTicket && esImagen(bulto.foto_ticket)) {
      tickets.push({
        key: `bulto-ticket-${fotoTicket}`,
        etiqueta: resguardo.bultos_empaque_cedis && resguardo.bultos_empaque_cedis.length > 1
          ? `Ticket ${bulto.numero}`
          : 'Ticket',
        path: rutaDocumentoResguardo(resguardo.id, fotoTicket),
      })
    }
  })

  resguardo.registro_manual?.evidencias?.forEach((evidencia) => {
    if (!esImagen(evidencia)) return
    if (evidencia.uso === 'paquete') {
      paquetes.push({
        key: `manual-paquete-${evidencia.id}`,
        etiqueta: 'Paquete',
        path: rutaEvidenciaResguardo(resguardo.id, evidencia.id),
      })
    }
    if (evidencia.uso === 'ticket') {
      tickets.push({
        key: `manual-ticket-${evidencia.id}`,
        etiqueta: 'Ticket',
        path: rutaEvidenciaResguardo(resguardo.id, evidencia.id),
      })
    }
  })

  const documentos = resguardo.pedido_revision?.documentos ?? []
  const revisiones = resguardo.pedido_revision?.revisiones_producto ?? []
  revisiones.forEach((revision) => {
    const fotos = documentos
      .filter((documento) => (
        documento.tipo === 'evidencia_condicion'
        && documento.relacion_tipo === 'revision_producto'
        && String(documento.relacion_id) === String(revision.id)
        && esImagen(documento)
      ))
      .map((documento) => ({
        key: `pieza-${documento.id}`,
        etiqueta: 'Pieza',
        path: rutaDocumentoResguardo(resguardo.id, documento.id),
      }))
    if (fotos.length === 0 && !revision.unica_pieza) return
    piezas.push({
      key: `revision-${revision.id}`,
      titulo: revision.descripcion_producto?.trim() || revision.sku || `Pieza #${revision.id}`,
      detalle: revision.sku || undefined,
      fotos,
    })
  })

  resguardo.registro_manual?.piezas?.forEach((pieza) => {
    piezas.push({
      key: `manual-pieza-${pieza.producto_id}`,
      titulo: pieza.descripcion?.trim() || pieza.sku || `Producto #${pieza.producto_id}`,
      detalle: [
        pieza.sku,
        `Cantidad ${pieza.cantidad}`,
      ].filter(Boolean).join(' · '),
      fotos: [],
    })
  })

  return { paquetes, tickets, piezas }
}

export function evidenciasEntrega(resguardoId: number, timeline: ResguardoTimelineItem[]) {
  const fotos: FotoResguardo[] = []
  const firmas: FotoResguardo[] = []

  timeline.forEach((item) => {
    if (!item.tipo_evento || !EVENTOS_ENTREGA.includes(item.tipo_evento)) return
    item.evidencias?.forEach((evidencia) => {
      if (!esImagen(evidencia)) return
      const foto = {
        key: `entrega-${evidencia.id}`,
        etiqueta: evidencia.tipo === 'firma' ? 'Firma' : 'Paquete abierto',
        path: rutaEvidenciaResguardo(resguardoId, evidencia.id),
      }
      if (evidencia.tipo === 'firma') firmas.push(foto)
      else fotos.push(foto)
    })
  })

  return { fotos, firmas }
}

export function hayContenidoVisual(contenido: ContenidoResguardoVista) {
  return contenido.paquetes.length > 0 || contenido.tickets.length > 0 || contenido.piezas.length > 0
}
