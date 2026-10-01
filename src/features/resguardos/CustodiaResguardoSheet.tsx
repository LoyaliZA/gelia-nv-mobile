import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, LoaderCircle, PackageCheck, RefreshCw, X } from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { ModalPortal } from '../../components/ui/ModalPortal'
import {
  cameraNativaDisponible,
  capturarEvidencia,
  prepararArchivoEvidencia,
} from './captureEvidencePhoto'
import {
  confirmarCustodiaResguardo,
  obtenerFormularioCustodiaResguardo,
} from './resguardo.api'
import type {
  ConfirmarCustodiaBultoInput,
  ResguardoBultoPendienteCustodia,
  ResguardoCustodiaFormResponse,
} from './resguardo.types'

interface Props {
  open: boolean
  resguardoId: number
  folioResumen?: string | null
  session: MobileSession
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

interface BultoEditable extends ConfirmarCustodiaBultoInput {
  key: string
}

function bultosIniciales(pendientes: ResguardoBultoPendienteCustodia[]): BultoEditable[] {
  return pendientes.map((bulto) => ({
    key: `bulto-${bulto.id}`,
    folio: bulto.folio,
    tipo: bulto.tipo || 'caja',
    condicion: bulto.condicion || 'bueno',
    piezas: bulto.piezas && bulto.piezas > 0 ? bulto.piezas : 1,
  }))
}

export function CustodiaResguardoSheet({
  open,
  resguardoId,
  folioResumen,
  session,
  onClose,
  onSuccess,
}: Props) {
  const [formulario, setFormulario] = useState<ResguardoCustodiaFormResponse | null>(null)
  const [cargando, setCargando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [almacenId, setAlmacenId] = useState('')
  const [bultos, setBultos] = useState<BultoEditable[]>([])
  const [evidencias, setEvidencias] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const evidenciaInputRef = useRef<HTMLInputElement | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const reiniciar = useCallback(() => {
    setFormulario(null)
    setAlmacenId('')
    setBultos([])
    setEvidencias([])
    setErrorCarga(null)
    setErrorEnvio(null)
    setExito(false)
  }, [])

  const cargar = useCallback(async (modo: 'inicial' | 'refrescar' | 'reintentar' = 'refrescar') => {
    if (modo === 'inicial' || modo === 'reintentar') reiniciar()
    setCargando(true)
    setErrorCarga(null)
    try {
      const data = await obtenerFormularioCustodiaResguardo(sessionRef.current, resguardoId)
      setFormulario(data)
      if (modo !== 'refrescar') {
        setBultos(bultosIniciales(data.resguardo.bultos_pendientes_custodia ?? []))
        if (data.almacenes.length === 1) {
          setAlmacenId(String(data.almacenes[0].id))
        }
      }
    } catch (err) {
      setErrorCarga(mensajeErrorPdv(err, 'No se pudo cargar el formulario de custodia.'))
    } finally {
      setCargando(false)
    }
  }, [resguardoId, reiniciar])

  useEffect(() => {
    if (!open) return
    void cargar('inicial')
  }, [open, resguardoId, cargar])

  const catalogos = formulario?.catalogos ?? {}
  const tiposBulto = catalogos.tipos_bulto ?? { caja: 'Caja' }
  const condiciones = catalogos.condiciones_bulto ?? { bueno: 'Bueno' }
  const titulo = formulario?.resguardo.snapshot_folio || folioResumen || `Resguardo #${resguardoId}`

  const actualizarBulto = (indice: number, campo: keyof ConfirmarCustodiaBultoInput, valor: string) => {
    setBultos((prev) => prev.map((bulto, i) => {
      if (i !== indice) return bulto
      if (campo === 'piezas') {
        const piezas = Number(valor)
        return { ...bulto, piezas: Number.isFinite(piezas) && piezas > 0 ? piezas : 1 }
      }
      return { ...bulto, [campo]: valor }
    }))
  }

  const agregarEvidencias = async (archivos: FileList | File[] | null) => {
    if (!archivos?.length) return
    const imagenes = Array.from(archivos).filter((archivo) => archivo.type.startsWith('image/'))
    if (imagenes.length === 0) return
    const preparadas = await Promise.all(
      imagenes.map((archivo, indice) => prepararArchivoEvidencia(archivo, `evidencia-${indice}`)),
    )
    setEvidencias((prev) => [...prev, ...preparadas])
  }

  const onEvidenciaInput = async (event: ChangeEvent<HTMLInputElement>) => {
    await agregarEvidencias(event.target.files)
    event.target.value = ''
  }

  const capturar = async (source: 'camera' | 'photos') => {
    const archivo = await capturarEvidencia(source, `evidencia-${Date.now()}`)
    if (archivo) setEvidencias((prev) => [...prev, archivo])
  }

  const enviar = async (event: FormEvent) => {
    event.preventDefault()
    if (!formulario || enviando) return

    if (!almacenId) {
      setErrorEnvio('Selecciona el almacén de custodia.')
      return
    }
    if (bultos.length === 0) {
      setErrorEnvio('No hay bultos pendientes de revisión.')
      return
    }

    setEnviando(true)
    setErrorEnvio(null)

    try {
      await confirmarCustodiaResguardo(
        session,
        resguardoId,
        formulario.resguardo.version,
        {
          almacenId: Number(almacenId),
          bultos,
          evidencias,
        },
      )
      setExito(true)
      await onSuccess()
    } catch (err) {
      setErrorEnvio(mensajeErrorPdv(err, 'No se pudo confirmar la custodia.'))
      await cargar()
    } finally {
      setEnviando(false)
    }
  }

  if (!open) return null

  const cerrar = () => {
    if (enviando) return
    onClose()
  }

  return (
    <ModalPortal>
      <div className="pdv-overlay pdv-overlay--stacked" role="presentation">
        <section aria-modal="true" className="pdv-sheet pdv-sheet--detail" role="dialog">
          <header className="pdv-sheet__header">
            <div>
              <span className="pdv-kicker">Custodia recepción</span>
              <h2>{titulo}</h2>
            </div>
            <button aria-label="Cerrar" className="pdv-icon-button" disabled={enviando} onClick={cerrar} type="button">
              <X size={19} />
            </button>
          </header>

          {cargando && !formulario && (
            <div className="pdv-loading-block"><LoaderCircle className="spin" /> Cargando revisión…</div>
          )}

          {errorCarga && !formulario && (
            <div className="pdv-state-card pdv-state-card--error">
              <p>{errorCarga}</p>
              <button className="secondary-button" onClick={() => void cargar('reintentar')} type="button">
                <RefreshCw size={15} /> Reintentar
              </button>
            </div>
          )}

          {exito && (
            <div className="pdv-detail">
              <div className="pdv-state-card">
                <CheckCircle2 size={28} />
                <p><strong>Custodia registrada</strong></p>
                <p className="pdv-muted">La revisión quedó registrada. El resguardo pasará a custodia cuando corresponda.</p>
                <button className="primary-button" onClick={cerrar} type="button">Cerrar</button>
              </div>
            </div>
          )}

          {!exito && formulario && !formulario.admite_confirmacion_custodia && (
            <div className="pdv-detail">
              <div className="pdv-state-card">
                <AlertTriangle size={22} />
                <p>{formulario.motivo_no_confirmacion_custodia || 'Este resguardo no admite confirmación de custodia en su estado actual.'}</p>
              </div>
            </div>
          )}

          {!exito && formulario?.admite_confirmacion_custodia && formulario.almacenes.length === 0 && (
            <div className="pdv-detail">
              <p className="pdv-muted">No hay almacenes activos en esta sucursal para registrar custodia.</p>
            </div>
          )}

          {!exito && formulario?.admite_confirmacion_custodia && formulario.almacenes.length > 0 && (
            <form className="pdv-form pdv-form--pinned" onSubmit={(event) => void enviar(event)}>
              <div className="pdv-form__scroll">
              <p className="pdv-muted">
                Revisa bultos y piezas antes de confirmar el ingreso a custodia en recepción.
              </p>

              <label>
                Almacén de custodia
                <select
                  disabled={enviando}
                  onChange={(event) => setAlmacenId(event.target.value)}
                  required
                  value={almacenId}
                >
                  <option value="">Seleccionar…</option>
                  {formulario.almacenes.map((almacen) => (
                    <option key={almacen.id} value={almacen.id}>
                      {almacen.codigo} — {almacen.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <section className="pdv-detail-section">
                <h4>Revisión de bultos</h4>
                <div className="pdv-mini-list">
                  {bultos.map((bulto, indice) => (
                    <div className="pdv-form__bulto" key={bulto.key}>
                      <p className="pdv-form__bulto-title">Bulto {indice + 1}: {bulto.folio}</p>
                      <div className="pdv-form__row">
                        <label>
                          Tipo
                          <select
                            disabled={enviando}
                            onChange={(event) => actualizarBulto(indice, 'tipo', event.target.value)}
                            value={bulto.tipo}
                          >
                            {Object.entries(tiposBulto).map(([valor, etiqueta]) => (
                              <option key={valor} value={valor}>{etiqueta}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Condición
                          <select
                            disabled={enviando}
                            onChange={(event) => actualizarBulto(indice, 'condicion', event.target.value)}
                            value={bulto.condicion}
                          >
                            {Object.entries(condiciones).map(([valor, etiqueta]) => (
                              <option key={valor} value={valor}>{etiqueta}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Piezas
                          <input
                            disabled={enviando}
                            min={1}
                            onChange={(event) => actualizarBulto(indice, 'piezas', event.target.value)}
                            required
                            type="number"
                            value={bulto.piezas}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pdv-detail-section">
                <span className="pdv-form__label">Evidencia fotográfica (opcional)</span>
                <div className="pdv-photo__actions">
                  {cameraNativaDisponible() ? (
                    <>
                      <button className="secondary-button" disabled={enviando} onClick={() => void capturar('camera')} type="button">
                        <Camera size={16} /> Tomar foto
                      </button>
                      <button className="secondary-button" disabled={enviando} onClick={() => void capturar('photos')} type="button">
                        <ImagePlus size={16} /> Galería
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        accept="image/*"
                        hidden
                        onChange={(event) => void onEvidenciaInput(event)}
                        ref={evidenciaInputRef}
                        type="file"
                      />
                      <button
                        className="secondary-button"
                        disabled={enviando}
                        onClick={() => evidenciaInputRef.current?.click()}
                        type="button"
                      >
                        <ImagePlus size={16} /> Adjuntar imagen
                      </button>
                    </>
                  )}
                </div>
                {evidencias.length > 0 && (
                  <p className="pdv-muted">{evidencias.length} imagen(es) adjunta(s)</p>
                )}
              </section>
              </div>

              {errorEnvio && <p className="form-error" role="alert">{errorEnvio}</p>}

              <button className="primary-button pdv-submit-button" disabled={enviando || bultos.length === 0} type="submit">
                {enviando ? <LoaderCircle className="spin" /> : <PackageCheck />}
                Confirmar custodia
              </button>
            </form>
          )}
        </section>
      </div>
    </ModalPortal>
  )
}
