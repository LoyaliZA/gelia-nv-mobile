import { Camera, ChevronLeft, ImagePlus, LoaderCircle, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import type { ClienteMovil } from '../clientes/cliente.types'
import { useClienteSync } from '../clientes/useClienteSync'
import type { MobileSession } from '../auth/auth.types'
import type { PdvOrigenResguardo } from '../puntoVenta/puntoVenta.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { abrirPrivacidad } from '../../lib/privacidad'
import { ModalPortal } from '../../components/ui/ModalPortal'
import { buscarProductosResguardo, registrarResguardoManual } from './resguardo.api'
import type { AltaResguardoPieza, ProductoResguardo } from './resguardo.types'
import {
  AVISO_CAMARA_RESGUARDO,
  cameraNativaDisponible,
  capturarEvidencia,
  prepararArchivoEvidencia,
} from './captureEvidencePhoto'

interface Props {
  origenes: PdvOrigenResguardo[]
  session: MobileSession
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

type Paso = 'paquete' | 'ticket' | 'cliente' | 'productos' | 'confirmar'

const PASOS: Array<{ id: Paso; label: string }> = [
  { id: 'paquete', label: 'Paquete' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'productos', label: 'Productos' },
  { id: 'confirmar', label: 'Confirmar' },
]

function etiquetaProducto(producto: ProductoResguardo) {
  return producto.descripcion || producto.sku || producto.folio || `Producto #${producto.id}`
}

export function AltaResguardoSheet({ origenes, session, onClose, onSuccess }: Props) {
  const { searchClientes } = useClienteSync()
  const paqueteInputRef = useRef<HTMLInputElement | null>(null)
  const ticketInputRef = useRef<HTMLInputElement | null>(null)
  const previewPaqueteRef = useRef<string | null>(null)
  const previewTicketRef = useRef<string | null>(null)
  const [paso, setPaso] = useState<Paso>('paquete')
  const [fotoPaquete, setFotoPaquete] = useState<File | null>(null)
  const [previewPaquete, setPreviewPaquete] = useState<string | null>(null)
  const [fotoTicket, setFotoTicket] = useState<File | null>(null)
  const [previewTicket, setPreviewTicket] = useState<string | null>(null)
  const [folio, setFolio] = useState('')
  const [origenId, setOrigenId] = useState(origenes[0]?.id ? String(origenes[0].id) : '')
  const [bultos, setBultos] = useState('1')
  const [enviaOtra, setEnviaOtra] = useState(false)
  const [nombreOtra, setNombreOtra] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResults, setClienteResults] = useState<ClienteMovil[]>([])
  const [cliente, setCliente] = useState<ClienteMovil | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [productoQuery, setProductoQuery] = useState('')
  const [productoResults, setProductoResults] = useState<ProductoResguardo[]>([])
  const [buscandoProducto, setBuscandoProducto] = useState(false)
  const [piezas, setPiezas] = useState<AltaResguardoPieza[]>([])
  const [capturando, setCapturando] = useState<'paquete' | 'ticket' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [presented, setPresented] = useState(false)

  useEffect(() => () => {
    if (previewPaqueteRef.current) URL.revokeObjectURL(previewPaqueteRef.current)
    if (previewTicketRef.current) URL.revokeObjectURL(previewTicketRef.current)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPresented(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const indice = PASOS.findIndex((item) => item.id === paso)
  const origen = origenes.find((item) => String(item.id) === origenId)

  const asignarFoto = (destino: 'paquete' | 'ticket', file: File) => {
    const url = URL.createObjectURL(file)
    if (destino === 'paquete') {
      if (previewPaqueteRef.current) URL.revokeObjectURL(previewPaqueteRef.current)
      previewPaqueteRef.current = url
      setFotoPaquete(file)
      setPreviewPaquete(url)
      return
    }
    if (previewTicketRef.current) URL.revokeObjectURL(previewTicketRef.current)
    previewTicketRef.current = url
    setFotoTicket(file)
    setPreviewTicket(url)
  }

  const tomarFoto = async (destino: 'paquete' | 'ticket', source: 'camera' | 'photos') => {
    setError(null)
    if (!cameraNativaDisponible()) {
      const input = destino === 'paquete' ? paqueteInputRef.current : ticketInputRef.current
      if (source === 'camera' && input) input.setAttribute('capture', 'environment')
      if (source === 'photos' && input) input.removeAttribute('capture')
      input?.click()
      return
    }

    setCapturando(destino)
    try {
      const file = await capturarEvidencia(source, destino === 'paquete' ? 'paquete' : 'ticket')
      if (file) asignarFoto(destino, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo obtener la imagen.')
    } finally {
      setCapturando(null)
    }
  }

  const onArchivo = async (destino: 'paquete' | 'ticket', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setCapturando(destino)
    try {
      asignarFoto(destino, await prepararArchivoEvidencia(file, destino))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
    } finally {
      setCapturando(null)
    }
  }

  const buscarCliente = async () => {
    const q = clienteQuery.trim()
    if (q.length < 2) {
      setError('Escribe al menos 2 caracteres para buscar al cliente.')
      return
    }
    setBuscandoCliente(true)
    setError(null)
    try {
      const result = await searchClientes(q, 1)
      setClienteResults(result.data.slice(0, 8))
      if (result.data.length === 0) setError('No hay clientes que coincidan con la búsqueda.')
    } catch {
      setError('No se pudo buscar clientes en este momento.')
    } finally {
      setBuscandoCliente(false)
    }
  }

  useEffect(() => {
    if (paso !== 'cliente' || cliente) return undefined
    const q = clienteQuery.trim()
    if (q.length < 2) {
      setClienteResults([])
      return undefined
    }
    const timer = window.setTimeout(() => {
      void buscarCliente()
    }, 350)
    return () => window.clearTimeout(timer)
  }, [paso, cliente, clienteQuery])

  const buscarProducto = async () => {
    const q = productoQuery.trim()
    if (q.length < 2) {
      setError('Escribe al menos 2 caracteres para buscar el producto.')
      return
    }
    setBuscandoProducto(true)
    setError(null)
    try {
      const result = await buscarProductosResguardo(session, q)
      setProductoResults(result.data)
      if (result.data.length === 0) setError('No hay productos que coincidan con la búsqueda.')
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo buscar productos.'))
    } finally {
      setBuscandoProducto(false)
    }
  }

  const agregarProducto = (producto: ProductoResguardo) => {
    setPiezas((current) => {
      const existing = current.find((pieza) => pieza.productoId === producto.id)
      if (existing) {
        return current.map((pieza) => (
          pieza.productoId === producto.id
            ? { ...pieza, cantidad: Math.min(9999, pieza.cantidad + 1) }
            : pieza
        ))
      }
      return [...current, {
        productoId: producto.id,
        cantidad: 1,
        etiqueta: etiquetaProducto(producto),
      }]
    })
    setProductoResults([])
    setProductoQuery('')
  }

  const validarPaso = () => {
    if (paso === 'paquete' && !fotoPaquete) return 'Toma la foto del paquete para continuar.'
    if (paso === 'ticket') {
      if (!fotoTicket) return 'Toma la foto del ticket para continuar.'
      if (!folio.trim()) return 'Captura el folio del ticket.'
      if (!origen) return 'Selecciona un origen válido.'
      const cantidad = Number(bultos)
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 500) {
        return 'La cantidad de bultos debe estar entre 1 y 500.'
      }
      if (enviaOtra && nombreOtra.trim().length < 2) {
        return 'Captura el nombre de la persona que recibe.'
      }
    }
    if (paso === 'cliente' && !cliente?.id) return 'Selecciona el cliente del resguardo.'
    return null
  }

  const continuar = () => {
    const mensaje = validarPaso()
    if (mensaje) {
      setError(mensaje)
      return
    }
    setError(null)
    setPaso(PASOS[Math.min(indice + 1, PASOS.length - 1)].id)
  }

  const confirmar = async () => {
    if (enviando || !fotoPaquete || !fotoTicket || !cliente?.id || !origen) return
    const mensaje = validarPaso()
    if (paso !== 'confirmar' && mensaje) {
      setError(mensaje)
      return
    }
    if (enviaOtra && nombreOtra.trim().length < 2) {
      setError('Captura el nombre de la persona que recibe.')
      return
    }

    setEnviando(true)
    setError(null)
    try {
      await registrarResguardoManual(session, {
        clienteId: cliente.id,
        folio,
        origenId: origen.id,
        cantidadBultos: Number(bultos),
        enviaAOtraPersona: enviaOtra,
        enviaOtraPersona: nombreOtra,
        observaciones,
        piezas,
        archivoTicket: fotoTicket,
        fotoPaquete,
      })
      await onSuccess()
      onClose()
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo registrar la recepción.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ModalPortal>
    <div
      className={`pdv-overlay pdv-overlay--animated${presented ? ' pdv-overlay--open' : ''}`}
      role="presentation"
    >
      <section aria-modal="true" className="pdv-sheet pdv-sheet--alta" role="dialog">
        <header className="pdv-sheet__header">
          <div>
            <span className="pdv-kicker">Alta manual</span>
            <h2>Registrar recepción</h2>
          </div>
          <button aria-label="Cerrar" className="pdv-icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <ol className="pdv-steps">
          {PASOS.map((item, index) => (
            <li aria-current={item.id === paso ? 'step' : undefined} key={item.id}>
              <span>{index + 1}</span>
              {item.label}
            </li>
          ))}
        </ol>

        <form className="pdv-form pdv-form--wizard" onSubmit={(event) => event.preventDefault()}>
          <div className="pdv-form__scroll">
            <div className="pdv-wizard-pane" key={paso}>
          {paso === 'paquete' && (
            <FotoStep
              aviso
              capturando={capturando === 'paquete'}
              inputRef={paqueteInputRef}
              preview={previewPaquete}
              titulo="Foto del paquete"
              onArchivo={(event) => void onArchivo('paquete', event)}
              onCapturar={(source) => void tomarFoto('paquete', source)}
            />
          )}

          {paso === 'ticket' && (
            <>
              <FotoStep
                capturando={capturando === 'ticket'}
                inputRef={ticketInputRef}
                preview={previewTicket}
                titulo="Foto del ticket"
                onArchivo={(event) => void onArchivo('ticket', event)}
                onCapturar={(source) => void tomarFoto('ticket', source)}
              />
              <label>
                Folio
                <input maxLength={64} onChange={(event) => setFolio(event.target.value)} value={folio} />
              </label>
              <label>
                Origen
                <select onChange={(event) => setOrigenId(event.target.value)} value={origenId}>
                  {origenes.length === 0 && <option value="">Sin orígenes configurados</option>}
                  {origenes.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                Bultos esperados
                <input inputMode="numeric" min={1} onChange={(event) => setBultos(event.target.value)} value={bultos} />
              </label>
              <label className="pdv-check">
                <input checked={enviaOtra} onChange={(event) => setEnviaOtra(event.target.checked)} type="checkbox" />
                Se envía a otra persona
              </label>
              {enviaOtra && (
                <label>
                  Nombre de quien recibe
                  <input maxLength={255} onChange={(event) => setNombreOtra(event.target.value)} value={nombreOtra} />
                </label>
              )}
              <label>
                Observaciones
                <textarea maxLength={2000} onChange={(event) => setObservaciones(event.target.value)} rows={3} value={observaciones} />
              </label>
            </>
          )}

          {paso === 'cliente' && (
            cliente ? (
              <div className="pdv-selected-client">
                <div>
                  <span>#{cliente.numero_cliente}</span>
                  <strong>{cliente.nombre}</strong>
                </div>
                <button className="secondary-button" onClick={() => setCliente(null)} type="button">Cambiar</button>
              </div>
            ) : (
              <>
                <div className="pdv-client-search pdv-client-search--solo">
                  <Search size={17} />
                  <input
                    onChange={(event) => setClienteQuery(event.target.value)}
                    placeholder="Nombre o número de cliente"
                    value={clienteQuery}
                  />
                </div>
                {buscandoCliente && <p className="pdv-muted">Buscando clientes…</p>}
                {clienteResults.length > 0 && (
                  <div className="pdv-client-results pdv-client-results--rows">
                    {clienteResults.map((item) => (
                      <button key={item.id} onClick={() => setCliente(item)} type="button">
                        <span>#{item.numero_cliente}</span>
                        <strong>{item.nombre}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {paso === 'productos' && (
            <>
              <p className="pdv-muted">Este paso es opcional. Agrega los productos del ticket si ya están identificados.</p>
              <div className="pdv-client-search">
                <Search size={17} />
                <input
                  onChange={(event) => setProductoQuery(event.target.value)}
                  placeholder="SKU, folio o descripción"
                  value={productoQuery}
                />
                <button className="secondary-button" disabled={buscandoProducto} onClick={() => void buscarProducto()} type="button">
                  {buscandoProducto ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
              {productoResults.length > 0 && (
                <div className="pdv-client-results">
                  {productoResults.map((producto) => (
                    <button key={producto.id} onClick={() => agregarProducto(producto)} type="button">
                      <span>{producto.sku || producto.folio || 'Sin SKU'}</span>
                      <strong>{etiquetaProducto(producto)}</strong>
                    </button>
                  ))}
                </div>
              )}
              {piezas.length > 0 && (
                <ul className="pdv-piezas">
                  {piezas.map((pieza) => (
                    <li key={pieza.productoId}>
                      <strong>{pieza.etiqueta}</strong>
                      <div>
                        <button
                          onClick={() => setPiezas((current) => current.flatMap((item) => {
                            if (item.productoId !== pieza.productoId) return [item]
                            if (item.cantidad <= 1) return []
                            return [{ ...item, cantidad: item.cantidad - 1 }]
                          }))}
                          type="button"
                        >
                          −
                        </button>
                        <span>{pieza.cantidad}</span>
                        <button
                          onClick={() => setPiezas((current) => current.map((item) => (
                            item.productoId === pieza.productoId
                              ? { ...item, cantidad: Math.min(9999, item.cantidad + 1) }
                              : item
                          )))}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {paso === 'confirmar' && fotoPaquete && fotoTicket && cliente && origen && (
            <div className="pdv-confirm">
              <img alt="Paquete fotografiado" src={previewPaquete ?? undefined} />
              <img alt="Ticket fotografiado" src={previewTicket ?? undefined} />
              <dl>
                <div><dt>Folio</dt><dd>{folio.trim()}</dd></div>
                <div><dt>Origen</dt><dd>{origen.nombre}</dd></div>
                <div><dt>Bultos</dt><dd>{bultos}</dd></div>
                <div><dt>Cliente</dt><dd>{cliente.nombre}</dd></div>
                <div><dt>Productos</dt><dd>{piezas.length === 0 ? 'Sin productos' : `${piezas.length} partida${piezas.length === 1 ? '' : 's'}`}</dd></div>
              </dl>
              <p className="pdv-muted">El resguardo quedará en Por recibir, igual que una recepción esperada de pedidos.</p>
            </div>
          )}
            </div>
          </div>

          {error && <p className="pdv-inline-error">{error}</p>}

          <div className="pdv-wizard-actions">
            {indice > 0 && (
              <button
                className="secondary-button"
                onClick={() => {
                  setError(null)
                  setPaso(PASOS[indice - 1].id)
                }}
                type="button"
              >
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            {paso === 'confirmar' ? (
              <button className="primary-button" disabled={enviando} onClick={() => void confirmar()} type="button">
                {enviando ? <LoaderCircle className="spin" size={16} /> : null}
                Confirmar recepción
              </button>
            ) : (
              <button className="primary-button" onClick={continuar} type="button">
                {paso === 'productos' ? 'Revisar' : 'Continuar'}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
    </ModalPortal>
  )
}

function FotoStep({
  aviso = false,
  capturando,
  inputRef,
  preview,
  titulo,
  onArchivo,
  onCapturar,
}: {
  aviso?: boolean
  capturando: boolean
  inputRef: RefObject<HTMLInputElement | null>
  preview: string | null
  titulo: string
  onArchivo: (event: ChangeEvent<HTMLInputElement>) => void
  onCapturar: (source: 'camera' | 'photos') => void
}) {
  return (
    <div className="pdv-photo">
      <strong>{titulo}</strong>
      {aviso && (
        <p>
          {AVISO_CAMARA_RESGUARDO}{' '}
          <button className="pdv-text-button" onClick={() => void abrirPrivacidad()} type="button">
            Política de privacidad
          </button>
        </p>
      )}
      {preview ? <img alt={titulo} src={preview} /> : <div className="pdv-photo__empty">Sin imagen</div>}
      <div className="pdv-photo__actions">
        <button className="primary-button" disabled={capturando} onClick={() => onCapturar('camera')} type="button">
          <Camera size={16} /> {capturando ? 'Abriendo…' : 'Tomar foto'}
        </button>
        <button className="secondary-button" disabled={capturando} onClick={() => onCapturar('photos')} type="button">
          <ImagePlus size={16} /> Galería
        </button>
      </div>
      <input
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={onArchivo}
        ref={inputRef}
        type="file"
      />
    </div>
  )
}
