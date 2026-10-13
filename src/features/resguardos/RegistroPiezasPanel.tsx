import { Camera, ImagePlus, ScanLine, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { MobileSession } from '../auth/auth.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { buscarProductosResguardo } from './resguardo.api'
import type { AltaResguardoPieza, ProductoResguardo } from './resguardo.types'
import {
  ESTADOS_FISICOS_PIEZA,
  etiquetaEstadoFisico,
  requiereFotoPieza,
  requiereObservacionPieza,
} from './estadoFisicoPieza'
import {
  cameraNativaDisponible,
  capturarEvidencia,
  prepararArchivoEvidencia,
} from './captureEvidencePhoto'
import { EscanerCodigoSheet } from './EscanerCodigoSheet'

function etiquetaProducto(producto: ProductoResguardo) {
  const folio = producto.folio === null || producto.folio === undefined ? null : String(producto.folio)
  return producto.descripcion || producto.sku || folio || `Producto #${producto.id}`
}

function piezaNueva(producto: ProductoResguardo): AltaResguardoPieza {
  return {
    localKey: `${producto.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productoId: producto.id,
    cantidad: 1,
    etiqueta: etiquetaProducto(producto),
    sku: producto.sku || producto.codigo_barras || (producto.folio == null ? undefined : String(producto.folio)),
    estadoFisico: 'bueno',
    nota: '',
    unicaPieza: false,
    mejorPieza: false,
    fotos: [],
    previews: [],
  }
}

export function validarPiezasRegistro(piezas: AltaResguardoPieza[], flujoCompleto: boolean) {
  if (flujoCompleto && piezas.length < 1) return 'Registre al menos una pieza del pedido.'
  for (const pieza of piezas) {
    if (requiereObservacionPieza(pieza.estadoFisico) && !pieza.nota?.trim()) {
      return `${pieza.etiqueta} requiere una observación.`
    }
    if (requiereFotoPieza(pieza.estadoFisico) && pieza.fotos.length < 1) {
      return `${pieza.etiqueta} requiere una foto del detalle.`
    }
  }
  return null
}

function textoCoincidenciaProducto(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined) return null
  const texto = String(valor).trim()
  return texto === '' ? null : texto.toLowerCase()
}

function coincidenciaExacta(productos: ProductoResguardo[], codigo: string) {
  const q = codigo.trim().toLowerCase()
  return productos.find((producto) => (
    textoCoincidenciaProducto(producto.sku) === q
    || textoCoincidenciaProducto(producto.codigo_barras) === q
    || textoCoincidenciaProducto(producto.folio) === q
  )) ?? null
}

interface Props {
  flujoCompleto: boolean
  piezas: AltaResguardoPieza[]
  session: MobileSession
  onChange: (piezas: AltaResguardoPieza[]) => void
}

export function RegistroPiezasPanel({ flujoCompleto, piezas, session, onChange }: Props) {
  const piezasRef = useRef(piezas)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const destinoFotoRef = useRef<string | null>(null)
  const [consulta, setConsulta] = useState('')
  const [resultados, setResultados] = useState<ProductoResguardo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [escanerAbierto, setEscanerAbierto] = useState(false)
  const [capturando, setCapturando] = useState<string | null>(null)

  piezasRef.current = piezas

  useEffect(() => () => {
    piezasRef.current.forEach((pieza) => {
      pieza.previews.forEach((url) => URL.revokeObjectURL(url))
    })
  }, [])

  const agregar = (producto: ProductoResguardo) => {
    const siguiente = [...piezasRef.current, piezaNueva(producto)]
    piezasRef.current = siguiente
    onChange(siguiente)
    setConsulta('')
    setResultados([])
    setError(null)
  }

  const buscar = async (termino: string, automatico = false) => {
    const q = termino.trim()
    if (q.length < 2) {
      const mensaje = 'Escribe al menos 2 caracteres para buscar el producto.'
      if (!automatico) setError(mensaje)
      return mensaje
    }
    setBuscando(true)
    setError(null)
    try {
      const result = await buscarProductosResguardo(session, q)
      const exacto = coincidenciaExacta(result.data, q)
      if (exacto) {
        agregar(exacto)
        return null
      }
      if (automatico && result.data.length === 1) {
        agregar(result.data[0])
        return null
      }
      setResultados(result.data)
      if (result.data.length === 0) {
        const mensaje = 'No hay productos que coincidan con la búsqueda.'
        setError(mensaje)
        return mensaje
      }
      if (automatico) {
        const mensaje = 'Hay varias coincidencias. Elige el producto en la lista.'
        setError(mensaje)
        return mensaje
      }
      return null
    } catch (err) {
      const mensaje = mensajeErrorPdv(err, 'No se pudo buscar productos.')
      setError(mensaje)
      return mensaje
    } finally {
      setBuscando(false)
    }
  }

  const actualizar = (localKey: string, cambio: Partial<AltaResguardoPieza>) => {
    const siguiente = piezasRef.current.map((pieza) => (
      pieza.localKey === localKey ? { ...pieza, ...cambio } : pieza
    ))
    piezasRef.current = siguiente
    onChange(siguiente)
  }

  const quitar = (localKey: string) => {
    const pieza = piezasRef.current.find((item) => item.localKey === localKey)
    pieza?.previews.forEach((url) => URL.revokeObjectURL(url))
    const siguiente = piezasRef.current.filter((item) => item.localKey !== localKey)
    piezasRef.current = siguiente
    onChange(siguiente)
  }

  const adjuntarFotos = async (localKey: string, archivos: File[]) => {
    const imagenes = archivos.filter((archivo) => archivo.type.startsWith('image/'))
    if (imagenes.length === 0) return
    const preparadas = await Promise.all(imagenes.slice(0, 8).map((archivo, indice) => (
      prepararArchivoEvidencia(archivo, `detalle-${localKey}-${indice}`)
    )))
    const actuales = piezasRef.current.find((pieza) => pieza.localKey === localKey)
    const fotos = [...(actuales?.fotos ?? []), ...preparadas].slice(0, 8)
    const previewsNuevas = preparadas.map((archivo) => URL.createObjectURL(archivo))
    const previews = [...(actuales?.previews ?? []), ...previewsNuevas].slice(0, 8)
    actualizar(localKey, { fotos, previews })
  }

  const tomarFoto = async (localKey: string, source: 'camera' | 'photos') => {
    if (!cameraNativaDisponible()) {
      destinoFotoRef.current = localKey
      const input = fileRef.current
      if (!input) return
      if (source === 'camera') input.setAttribute('capture', 'environment')
      else input.removeAttribute('capture')
      input.click()
      return
    }
    setCapturando(localKey)
    setError(null)
    try {
      const archivo = await capturarEvidencia(source, `detalle-${localKey}`)
      if (archivo) await adjuntarFotos(localKey, [archivo])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo obtener la imagen.')
    } finally {
      setCapturando(null)
    }
  }

  const onArchivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const localKey = destinoFotoRef.current
    const archivos = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!localKey || archivos.length === 0) return
    setCapturando(localKey)
    try {
      await adjuntarFotos(localKey, archivos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
    } finally {
      setCapturando(null)
    }
  }

  return (
    <>
      <p className="pdv-muted">
        {flujoCompleto
          ? 'Escanea cada pieza o busca por SKU. Queda en Bueno hasta que cambies el estado, la observación o las marcas.'
          : 'Este paso es opcional. Escanea o busca los productos del ticket si ya están identificados.'}
      </p>
      <div className="pdv-client-search pdv-client-search--scan">
        <Search size={17} />
        <input
          onChange={(event) => setConsulta(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void buscar(consulta, true)
          }}
          placeholder="SKU, código o descripción"
          value={consulta}
        />
        <button className="secondary-button" disabled={buscando} onClick={() => void buscar(consulta)} type="button">
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
        <button aria-label="Escanear código" className="pdv-icon-button" onClick={() => setEscanerAbierto(true)} type="button">
          <ScanLine size={18} />
        </button>
      </div>
      {resultados.length > 0 && (
        <div className="pdv-client-results">
          {resultados.map((producto) => (
            <button key={producto.id} onClick={() => agregar(producto)} type="button">
              <span>{producto.sku || producto.codigo_barras || producto.folio || 'Sin SKU'}</span>
              <strong>{etiquetaProducto(producto)}</strong>
            </button>
          ))}
        </div>
      )}
      {error && <p className="pdv-inline-error">{error}</p>}
      {piezas.length > 0 && (
        <ul className="pdv-piezas">
          {piezas.map((pieza, indice) => (
            <li className="pdv-pieza-card" key={pieza.localKey}>
              <header>
                <div>
                  <strong>{indice + 1}. {pieza.etiqueta}</strong>
                  <small>{pieza.sku || 'Sin SKU'} · {etiquetaEstadoFisico(pieza.estadoFisico)}</small>
                </div>
                <button aria-label="Quitar pieza" onClick={() => quitar(pieza.localKey)} type="button">
                  <Trash2 size={15} />
                </button>
              </header>
              <label>
                Estado
                <select
                  onChange={(event) => actualizar(pieza.localKey, {
                    estadoFisico: event.target.value as AltaResguardoPieza['estadoFisico'],
                  })}
                  value={pieza.estadoFisico}
                >
                  {ESTADOS_FISICOS_PIEZA.map((estado) => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Observación{requiereObservacionPieza(pieza.estadoFisico) ? ' *' : ''}
                <textarea
                  maxLength={500}
                  onChange={(event) => actualizar(pieza.localKey, { nota: event.target.value })}
                  placeholder="Detalle del producto"
                  rows={2}
                  value={pieza.nota ?? ''}
                />
              </label>
              <div className="pdv-checks">
                <label className="pdv-check">
                  <input
                    checked={pieza.unicaPieza}
                    onChange={(event) => actualizar(pieza.localKey, { unicaPieza: event.target.checked })}
                    type="checkbox"
                  />
                  Existencia única
                </label>
                <label className="pdv-check">
                  <input
                    checked={pieza.mejorPieza}
                    onChange={(event) => actualizar(pieza.localKey, { mejorPieza: event.target.checked })}
                    type="checkbox"
                  />
                  Mejor pieza
                </label>
              </div>
              <div className="pdv-photo">
                <strong>Detalle fotográfico{requiereFotoPieza(pieza.estadoFisico) ? ' *' : ''}</strong>
                {pieza.previews.length > 0 && (
                  <div className="pdv-thumb-row">
                    {pieza.previews.map((url) => (
                      <img alt="" key={url} src={url} />
                    ))}
                  </div>
                )}
                <div className="pdv-photo__actions">
                  <button
                    className="secondary-button"
                    disabled={capturando === pieza.localKey}
                    onClick={() => void tomarFoto(pieza.localKey, 'camera')}
                    type="button"
                  >
                    <Camera size={16} /> {capturando === pieza.localKey ? 'Abriendo…' : 'Tomar foto'}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={capturando === pieza.localKey}
                    onClick={() => void tomarFoto(pieza.localKey, 'photos')}
                    type="button"
                  >
                    <ImagePlus size={16} /> Galería
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        accept="image/jpeg,image/png,image/webp"
        hidden
        multiple
        onChange={(event) => void onArchivo(event)}
        ref={fileRef}
        type="file"
      />
      <EscanerCodigoSheet
        abierto={escanerAbierto}
        onCerrar={() => setEscanerAbierto(false)}
        onCodigo={(codigo) => buscar(codigo, true)}
      />
    </>
  )
}
