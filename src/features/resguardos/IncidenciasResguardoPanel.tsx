import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Camera, LoaderCircle } from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { PDV_PERMISSION } from '../puntoVenta/puntoVentaAccess'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../puntoVenta/usePuntoVenta'
import { registrarIncidenciaResguardo, resolverIncidenciaResguardo } from './resguardo.api'
import type { RegistrarIncidenciaInput, ResguardoAlmacenCustodia, ResguardoDetalle } from './resguardo.types'
import { prepararArchivoEvidencia } from './captureEvidencePhoto'

interface Props {
  resguardo: ResguardoDetalle
  almacenes: ResguardoAlmacenCustodia[]
  session: MobileSession
  onChanged: () => Promise<void>
}

const TIPOS: Array<{ value: RegistrarIncidenciaInput['tipo']; label: string; permiso: keyof typeof PDV_PERMISSION }> = [
  { value: 'folio_no_encontrado', label: 'Folio no encontrado', permiso: 'resguardosIncidenciaFolio' },
  { value: 'dano', label: 'Daño', permiso: 'resguardosIncidenciaDano' },
  { value: 'faltante', label: 'Faltante', permiso: 'resguardosIncidenciaFaltante' },
]

export function IncidenciasResguardoPanel({ resguardo, almacenes, session, onChanged }: Props) {
  const { contexto } = usePuntoVenta()
  const archivoRef = useRef<HTMLInputElement | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<RegistrarIncidenciaInput['tipo'] | ''>('')
  const [descripcion, setDescripcion] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [almacenId, setAlmacenId] = useState('')
  const [folioBulto, setFolioBulto] = useState('')
  const [tipoBulto, setTipoBulto] = useState('caja')
  const [condicion, setCondicion] = useState('danado')
  const [resolviendoId, setResolviendoId] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const permitido = (clave: boolean | undefined, permiso: string) => Boolean(
    clave && session.permissions.includes(permiso),
  )
  const tiposDisponibles = TIPOS.filter((item) => {
    const clave = item.value === 'folio_no_encontrado'
      ? contexto?.permisos.resguardos_incidencia_folio
      : item.value === 'dano'
        ? contexto?.permisos.resguardos_incidencia_dano
        : contexto?.permisos.resguardos_incidencia_faltante
    return permitido(clave, PDV_PERMISSION[item.permiso])
  })
  const puedeRegistrar = tiposDisponibles.length > 0
    && (resguardo.estado === 'pendiente_recepcion' || resguardo.estado === 'en_custodia')
  const puedeAutorizar = permitido(
    contexto?.permisos.resguardos_autorizar_entrega_incidencia,
    PDV_PERMISSION.resguardosAutorizarEntregaIncidencia,
  )
  const puedeCerrarFolio = permitido(
    contexto?.permisos.resguardos_incidencia_folio,
    PDV_PERMISSION.resguardosIncidenciaFolio,
  )
  const exigeFoto = tipo === 'dano' || tipo === 'faltante'
  const exigeBulto = tipo === 'dano'

  const onFoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setFoto(await prepararArchivoEvidencia(file, 'incidencia'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.')
    }
  }

  const registrar = async (event: FormEvent) => {
    event.preventDefault()
    if (!tipo || enviando) return
    if (exigeFoto && !foto) {
      setError('Adjunta una fotografía de la incidencia.')
      return
    }
    if (exigeBulto && (!almacenId || !folioBulto.trim())) {
      setError('Indica el almacén y el folio del bulto dañado.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await registrarIncidenciaResguardo(session, resguardo.id, resguardo.version, {
        tipo,
        descripcion,
        evidencias: foto ? [foto] : undefined,
        almacenId: exigeBulto ? Number(almacenId) : undefined,
        bulto: exigeBulto
          ? { folio: folioBulto, tipo: tipoBulto, condicion, piezas: 1 }
          : undefined,
      })
      setAbierto(false)
      setDescripcion('')
      setFoto(null)
      setTipo('')
      await onChanged()
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo registrar la incidencia.'))
    } finally {
      setEnviando(false)
    }
  }

  const resolver = async (incidenciaId: number, incidenciaVersion: number) => {
    if (!motivo.trim() || enviando) return
    setEnviando(true)
    setError(null)
    try {
      await resolverIncidenciaResguardo(
        session,
        resguardo.id,
        incidenciaId,
        resguardo.version,
        incidenciaVersion,
        motivo,
      )
      setResolviendoId(null)
      setMotivo('')
      await onChanged()
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo resolver la incidencia.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="pdv-detail-section">
      <div className="pdv-section-heading">
        <h4>Incidencias</h4>
        {puedeRegistrar && !abierto && (
          <button className="secondary-button" onClick={() => setAbierto(true)} type="button">
            Reportar
          </button>
        )}
      </div>
      {resguardo.incidencias.length === 0 && <p className="pdv-muted">Sin incidencias registradas.</p>}
      <div className="pdv-mini-list">
        {resguardo.incidencias.map((incidencia) => {
          const abierta = incidencia.estado === 'abierta'
          const puedeResolver = abierta && (
            incidencia.tipo === 'folio_no_encontrado' ? puedeCerrarFolio : puedeAutorizar
          )
          return (
            <div className="pdv-mini-row" key={incidencia.id}>
              <div>
                <strong>{incidencia.tipo_etiqueta || incidencia.tipo || 'Incidencia'}</strong>
                <span>{incidencia.estado_etiqueta || incidencia.estado}</span>
                {incidencia.descripcion && <span>{incidencia.descripcion}</span>}
              </div>
              {puedeResolver && resolviendoId !== incidencia.id && (
                <button className="secondary-button" onClick={() => { setResolviendoId(incidencia.id); setMotivo('') }} type="button">
                  Resolver
                </button>
              )}
              {resolviendoId === incidencia.id && (
                <form className="pdv-form" onSubmit={(event) => { event.preventDefault(); void resolver(incidencia.id, incidencia.version ?? 1) }}>
                  <label>
                    Motivo de resolución
                    <textarea maxLength={5000} onChange={(event) => setMotivo(event.target.value)} required rows={3} value={motivo} />
                  </label>
                  <button className="primary-button" disabled={enviando} type="submit">
                    {enviando ? <LoaderCircle className="spin" /> : 'Confirmar resolución'}
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>

      {abierto && (
        <form className="pdv-form" onSubmit={(event) => void registrar(event)}>
          <label>
            Tipo
            <select onChange={(event) => setTipo(event.target.value as RegistrarIncidenciaInput['tipo'])} required value={tipo}>
              <option value="">Selecciona</option>
              {tiposDisponibles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Descripción
            <textarea maxLength={5000} onChange={(event) => setDescripcion(event.target.value)} required rows={3} value={descripcion} />
          </label>
          {exigeBulto && (
            <>
              <label>
                Almacén
                <select onChange={(event) => setAlmacenId(event.target.value)} required value={almacenId}>
                  <option value="">Selecciona</option>
                  {almacenes.map((almacen) => (
                    <option key={almacen.id} value={almacen.id}>{almacen.codigo} · {almacen.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                Folio del bulto
                <input maxLength={64} onChange={(event) => setFolioBulto(event.target.value)} required value={folioBulto} />
              </label>
              <label>
                Tipo de bulto
                <select onChange={(event) => setTipoBulto(event.target.value)} value={tipoBulto}>
                  <option value="caja">Caja</option>
                  <option value="bolsa">Bolsa</option>
                </select>
              </label>
              <label>
                Condición
                <select onChange={(event) => setCondicion(event.target.value)} value={condicion}>
                  <option value="danado">Dañado</option>
                  <option value="humedad">Humedad</option>
                  <option value="incompleto">Incompleto</option>
                  <option value="bueno">Bueno</option>
                </select>
              </label>
            </>
          )}
          {exigeFoto && (
            <div className="pdv-photo">
              <strong>Fotografía</strong>
              <p>{foto ? foto.name : 'La evidencia fotográfica es obligatoria para este tipo.'}</p>
              <button className="secondary-button" onClick={() => archivoRef.current?.click()} type="button">
                <Camera size={16} /> Adjuntar foto
              </button>
              <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void onFoto(event)} ref={archivoRef} type="file" />
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="pdv-action-stack">
            <button className="primary-button" disabled={enviando} type="submit">
              {enviando ? <LoaderCircle className="spin" /> : 'Registrar incidencia'}
            </button>
            <button className="secondary-button" onClick={() => setAbierto(false)} type="button">Cancelar</button>
          </div>
        </form>
      )}
      {!abierto && error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
