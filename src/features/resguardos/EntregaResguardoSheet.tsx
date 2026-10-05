import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, ImagePlus, LoaderCircle, Maximize2, Trash2, X } from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { entregarResguardo } from './resguardo.api'
import type { ResguardoDetalle } from './resguardo.types'
import { SignaturePad } from './SignaturePad'
import type { SignaturePadHandle } from './SignaturePad'
import { SignatureFullscreenOverlay } from './SignatureFullscreenOverlay'
import { dataUrlABlob, esDispositivoCampo } from './entregaResguardoFirma'
import { ModalPortal } from '../../components/ui/ModalPortal'
import { ContenidoResguardoPanel } from './ContenidoResguardoPanel'
import {
  cameraNativaDisponible,
  capturarEvidencia,
  prepararArchivoEvidencia,
} from './captureEvidencePhoto'

interface Props {
  open: boolean
  resguardo: ResguardoDetalle
  session: MobileSession
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export function nombreClienteResguardo(resguardo: Pick<ResguardoDetalle, 'snapshot_cliente_nombre' | 'cliente'>) {
  return (resguardo.snapshot_cliente_nombre || resguardo.cliente?.nombre || '').trim()
}

export function entregaEsTercero(resguardo: Pick<ResguardoDetalle, 'envia_a_otra_persona' | 'envia_otra_persona'>) {
  const valor = resguardo.envia_a_otra_persona as boolean | number | string | null | undefined
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return true
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return false
  return Boolean(resguardo.envia_otra_persona?.trim())
}

function bultosEntregables(resguardo: Pick<ResguardoDetalle, 'bultos'>) {
  return (resguardo.bultos ?? []).filter((bulto) => bulto.estado === 'en_custodia' || bulto.estado === 'recibido')
}

export function EntregaResguardoSheet({
  open,
  resguardo,
  session,
  onClose,
  onSuccess,
}: Props) {
  const signatureRef = useRef<SignaturePadHandle | null>(null)
  const nombreCliente = nombreClienteResguardo(resguardo)
  const nombreTerceroRegistrado = (resguardo.envia_otra_persona || '').trim()
  const entregables = bultosEntregables(resguardo)
  const [relacion, setRelacion] = useState<'titular' | 'tercero'>(entregaEsTercero(resguardo) ? 'tercero' : 'titular')
  const [nombreTercero, setNombreTercero] = useState(nombreTerceroRegistrado)
  const [nombreManual, setNombreManual] = useState('')
  const [bultoIds, setBultoIds] = useState<number[]>(() => entregables.map((bulto) => bulto.id))
  const [observaciones, setObservaciones] = useState('')
  const [fotoPaqueteAbierto, setFotoPaqueteAbierto] = useState<File | null>(null)
  const [previewAbierto, setPreviewAbierto] = useState<string | null>(null)
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null)
  const [firmaDataUrlGuardada, setFirmaDataUrlGuardada] = useState<string | null>(null)
  const [overlayFirmaAbierto, setOverlayFirmaAbierto] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const archivoRef = useRef<HTMLInputElement | null>(null)
  const previewRef = useRef<string | null>(null)
  const formularioInicializadoParaId = useRef<number | null>(null)
  const referencia = resguardo.referencia_cliente
    || (resguardo.cliente ? `#${resguardo.cliente.numero_cliente}` : 'Sin referencia')

  useEffect(() => {
    if (!open) {
      formularioInicializadoParaId.current = null
      return
    }
    if (formularioInicializadoParaId.current === resguardo.id) return
    formularioInicializadoParaId.current = resguardo.id

    setRelacion(entregaEsTercero(resguardo) ? 'tercero' : 'titular')
    setNombreTercero(nombreTerceroRegistrado)
    setNombreManual('')
    setBultoIds(bultosEntregables(resguardo).map((bulto) => bulto.id))
    setObservaciones('')
    setFotoPaqueteAbierto(null)
    setFirmaPreview(null)
    setFirmaDataUrlGuardada(null)
    setOverlayFirmaAbierto(false)
    signatureRef.current?.clear()
    setError(null)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPreviewAbierto(null)
  }, [open, nombreTerceroRegistrado, resguardo])

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  const asignarPaqueteAbierto = (file: File) => {
    const url = URL.createObjectURL(file)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setFotoPaqueteAbierto(file)
    setPreviewAbierto(url)
  }

  const tomarPaqueteAbierto = async (source: 'camera' | 'photos') => {
    setError(null)
    if (!cameraNativaDisponible()) {
      if (source === 'camera') archivoRef.current?.setAttribute('capture', 'environment')
      else archivoRef.current?.removeAttribute('capture')
      archivoRef.current?.click()
      return
    }
    setCapturando(true)
    try {
      const file = await capturarEvidencia(source, 'paquete-abierto')
      if (file) asignarPaqueteAbierto(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo obtener la imagen del paquete abierto.')
    } finally {
      setCapturando(false)
    }
  }

  const onArchivoPaquete = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setCapturando(true)
    try {
      asignarPaqueteAbierto(await prepararArchivoEvidencia(file, 'paquete-abierto'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
    } finally {
      setCapturando(false)
    }
  }

  if (!open) return null

  const esTercero = relacion === 'tercero'
  const faltaNombreCliente = !esTercero && !nombreCliente
  const nombreQuienRetira = (esTercero ? nombreTercero : (nombreCliente || nombreManual)).trim()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enviando) return

    if (entregables.length > 0 && bultoIds.length === 0) {
      setError('Selecciona al menos un bulto en custodia para entregar.')
      return
    }

    if (!nombreQuienRetira) {
      setError(esTercero
        ? 'Captura el nombre de la persona que recibe el resguardo.'
        : 'Este resguardo no tiene el nombre del cliente.')
      return
    }

    if (!fotoPaqueteAbierto) {
      setError('Toma la foto del paquete abierto antes de completar la entrega.')
      return
    }

    const tieneFirma = Boolean(firmaDataUrlGuardada) || Boolean(signatureRef.current?.hasSignature())
    if (!tieneFirma) {
      setError('Solicita la firma antes de completar la entrega.')
      return
    }

    const firma = firmaDataUrlGuardada
      ? await dataUrlABlob(firmaDataUrlGuardada)
      : await signatureRef.current?.toBlob()
    if (!firma) {
      setError('No se pudo preparar la firma. Intenta dibujarla nuevamente.')
      return
    }

    setEnviando(true)
    setError(null)

    try {
      await entregarResguardo(session, resguardo.id, resguardo.version, {
        relacion: esTercero ? 'tercero' : 'titular',
        nombreQuienRetira,
        observaciones,
        firma,
        fotoPaqueteAbierto,
        bultoIds,
      })
      await onSuccess()
      onClose()
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo registrar la entrega.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ModalPortal>
      <div className="pdv-overlay pdv-overlay--stacked" role="presentation">
        <section aria-modal="true" className="pdv-sheet pdv-sheet--dialog" role="dialog">
          <header className="pdv-sheet__header">
            <div>
              <span className="pdv-kicker">Entrega de resguardo</span>
              <h2>{resguardo.snapshot_folio || `Resguardo #${resguardo.id}`}</h2>
            </div>
            <button aria-label="Cerrar" className="pdv-icon-button" disabled={enviando} onClick={onClose} type="button">
              <X size={19} />
            </button>
          </header>

          <form className="pdv-form pdv-form--pinned" onSubmit={(event) => void submit(event)}>
            <div className="pdv-form__scroll">
            <div className="pdv-detail__hero">
              <div>
                <span className="pdv-status-chip">{esTercero ? 'Recibe un tercero' : 'Recibe el cliente'}</span>
                <h3>{nombreCliente || 'Cliente sin nombre'}</h3>
                <p>{referencia}</p>
              </div>
            </div>

            <ContenidoResguardoPanel resguardo={resguardo} token={session.accessToken} />

            {entregables.length > 0 && (
              <fieldset className="pdv-form__bulto">
                <legend className="pdv-form__bulto-title">Bultos a entregar</legend>
                <p className="pdv-muted">
                  {bultoIds.length < entregables.length
                    ? 'La entrega quedará parcial.'
                    : 'Se entregan todos los bultos en custodia.'}
                </p>
                {entregables.map((bulto) => {
                  const marcado = bultoIds.includes(bulto.id)
                  return (
                    <label className="pdv-check-row" key={bulto.id}>
                      <input
                        checked={marcado}
                        disabled={enviando}
                        onChange={() => {
                          setBultoIds((actual) => (
                            marcado
                              ? actual.filter((id) => id !== bulto.id)
                              : [...actual, bulto.id]
                          ))
                        }}
                        type="checkbox"
                      />
                      <span>{bulto.folio || `Bulto #${bulto.id}`} · {bulto.estado || 'en custodia'}</span>
                    </label>
                  )
                })}
              </fieldset>
            )}

            <div className="pdv-selected-client">
              <div>
                <span>Cliente del resguardo</span>
                <strong>{nombreCliente || 'Sin nombre registrado'}</strong>
              </div>
            </div>

            <div className="pdv-segmented" role="group" aria-label="Quién recibe">
              <button aria-pressed={!esTercero} disabled={enviando} onClick={() => setRelacion('titular')} type="button">
                Cliente titular
              </button>
              <button aria-pressed={esTercero} disabled={enviando} onClick={() => setRelacion('tercero')} type="button">
                Tercero
              </button>
            </div>

            {esTercero ? (
              <>
                <p className="pdv-entrega-nota">
                  El resguardo queda a nombre del cliente. La persona que lo recibe se registra como tercero.
                </p>
                <label>
                  Tercero que recibe
                  <input
                    autoComplete="name"
                    disabled={enviando}
                    maxLength={255}
                    onChange={(event) => setNombreTercero(event.target.value)}
                    placeholder="Nombre de quien recibe"
                    value={nombreTercero}
                  />
                </label>
              </>
            ) : (
              <label>
                Quien recibe
                <input
                  autoComplete="name"
                  disabled={enviando}
                  maxLength={255}
                  onChange={(event) => setNombreManual(event.target.value)}
                  readOnly={!faltaNombreCliente}
                  value={faltaNombreCliente ? nombreManual : nombreCliente}
                />
              </label>
            )}

            <label>
              Observaciones
              <textarea
                disabled={enviando}
                maxLength={1000}
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Opcional"
                rows={3}
                value={observaciones}
              />
            </label>

            <div className="pdv-photo">
              <strong>Paquete abierto</strong>
              <p>Fotografía el paquete ya abierto, con el contenido visible, antes de entregarlo.</p>
              {previewAbierto
                ? <img alt="Paquete abierto" src={previewAbierto} />
                : <div className="pdv-photo__empty">Sin imagen</div>}
              <div className="pdv-photo__actions">
                <button className="primary-button" disabled={enviando || capturando} onClick={() => void tomarPaqueteAbierto('camera')} type="button">
                  <Camera size={16} /> {capturando ? 'Abriendo…' : 'Tomar foto'}
                </button>
                <button className="secondary-button" disabled={enviando || capturando} onClick={() => void tomarPaqueteAbierto('photos')} type="button">
                  <ImagePlus size={16} /> Galería
                </button>
              </div>
              <input
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => void onArchivoPaquete(event)}
                ref={archivoRef}
                type="file"
              />
            </div>

            <div className="pdv-signature-section">
              <span className="pdv-form__label">Firma de conformidad</span>
              <p className="pdv-muted pdv-signature-section__hint">
                La firma es obligatoria para validar la entrega.
                {esDispositivoCampo() ? ' En este dispositivo se recomienda firmar en pantalla completa en horizontal.' : ''}
              </p>

              {firmaDataUrlGuardada ? (
                <div className="pdv-signature-section__preview">
                  <img alt="Vista previa de la firma capturada" src={firmaDataUrlGuardada} />
                  <div className="pdv-signature-section__actions">
                    <button
                      className="secondary-button"
                      disabled={enviando}
                      onClick={() => setOverlayFirmaAbierto(true)}
                      type="button"
                    >
                      <Maximize2 size={16} /> Volver a firmar
                    </button>
                    <button
                      className="secondary-button"
                      disabled={enviando}
                      onClick={() => {
                        signatureRef.current?.clear()
                        setFirmaDataUrlGuardada(null)
                        setFirmaPreview(null)
                      }}
                      type="button"
                    >
                      <Trash2 size={16} /> Quitar firma
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <SignaturePad onSignatureChange={setFirmaPreview} ref={signatureRef} />
                  <button
                    className="primary-button pdv-signature-section__fullscreen"
                    disabled={enviando}
                    onClick={() => setOverlayFirmaAbierto(true)}
                    type="button"
                  >
                    <Maximize2 size={16} /> Firmar en pantalla completa
                  </button>
                </>
              )}
            </div>

            <SignatureFullscreenOverlay
              disabled={enviando}
              initialDataUrl={firmaDataUrlGuardada || firmaPreview}
              onClose={() => setOverlayFirmaAbierto(false)}
              onSave={(url) => {
                setFirmaDataUrlGuardada(url)
                setFirmaPreview(url)
                signatureRef.current?.loadDataUrl(url)
              }}
              open={overlayFirmaAbierto}
            />

            <div className="pdv-evidence-block">
              <h4>Evidencia de entrega</h4>
              <div className="pdv-evidence-grid">
                <figure className="pdv-evidence-card">
                  <span>Paquete abierto</span>
                  {previewAbierto
                    ? <img alt="Paquete abierto para la entrega" src={previewAbierto} />
                    : <div className="pdv-photo__empty">Falta la foto</div>}
                </figure>
                <figure className="pdv-evidence-card">
                  <span>Firma</span>
                  {firmaPreview
                    ? <img alt="Firma de quien recibe" src={firmaPreview} />
                    : <div className="pdv-photo__empty">Falta la firma</div>}
                </figure>
              </div>
            </div>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="primary-button pdv-submit-button" disabled={enviando} type="submit">
              {enviando ? <><LoaderCircle className="spin" size={17} /> Registrando…</> : 'Completar entrega'}
            </button>
          </form>
        </section>
      </div>
    </ModalPortal>
  )
}
