import { CalendarDays, RefreshCw, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { MobileSession } from '../auth/auth.types'
import { SucursalActivaCard } from '../puntoVenta/SucursalActivaCard'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../puntoVenta/usePuntoVenta'
import { confirmarLlegadaVisita, obtenerVisitasDelDia } from './visita.api'
import { consumeVisitaFocusId } from './visita.navigation'
import {
  etiquetaAsistencia,
  etiquetaEstado,
  etiquetaTiempo,
  fechaVisita,
  nombreSucursal,
  visitaCardDomId,
} from './visita.presentacion'
import type { VisitaProgramadaItem, VisitasDelDiaResponse } from './visita.types'

interface Props {
  session: MobileSession
}

function VisitaCard({
  item,
  sucursalActivaNombre,
  puedeConfirmar,
  busy,
  onLlegada,
}: {
  item: VisitaProgramadaItem
  sucursalActivaNombre: string | null
  puedeConfirmar: boolean
  busy: boolean
  onLlegada: (id: number) => void
}) {
  const tiempo = etiquetaTiempo(item.estado_tiempo)
  const asistencia = etiquetaAsistencia(item)
  const sucursal = nombreSucursal(item, sucursalActivaNombre)

  return (
    <article className="pdv-visita-card" id={visitaCardDomId(item.id)}>
      {sucursal && (
        <p className="pdv-visita-card__sucursal-kicker">
          Sucursal: {sucursal}
        </p>
      )}

      <div className="pdv-visita-card__lead">
        <span className="pdv-visita-card__numero">{item.cliente?.numero_cliente ?? '—'}</span>
        <strong className="pdv-visita-card__nombre">{item.cliente?.nombre ?? 'Cliente'}</strong>
        {item.fecha && (
          <span className="pdv-visita-card__fecha">
            <CalendarDays size={14} aria-hidden />
            {fechaVisita(item.fecha)}
          </span>
        )}
      </div>

      <dl className="pdv-visita-card__grid">
        <div>
          <dt>Hora</dt>
          <dd>{item.hora_etiqueta}</dd>
        </div>
        {sucursal && (
          <div>
            <dt>Sucursal</dt>
            <dd>{sucursal}</dd>
          </div>
        )}
        <div>
          <dt>Registró</dt>
          <dd>{item.registrado_por?.nombre ?? '—'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{etiquetaEstado(item)}</dd>
        </div>
        {item.registrado_por?.departamento && (
          <div className="pdv-visita-card__grid-span">
            <dt>Departamento</dt>
            <dd>{item.registrado_por.departamento}</dd>
          </div>
        )}
      </dl>

      {(item.probabilidad_asistencia || asistencia) && (
        <div className="pdv-visita-card__highlight">
          <span className="pdv-kicker">Probabilidad de asistencia</span>
          {item.probabilidad_asistencia && (
            <p className="pdv-visita-card__probabilidad">{item.probabilidad_asistencia}</p>
          )}
          {asistencia && (
            <p className="pdv-visita-card__asistencia">
              <UserCheck size={16} aria-hidden />
              {asistencia}
            </p>
          )}
        </div>
      )}

      <div className="pdv-chip-row pdv-visita-card__chips">
        <span className="pdv-status-chip pdv-status-chip--accent">{etiquetaEstado(item)}</span>
        {asistencia && (
          <span className="pdv-status-chip pdv-status-chip--ok">{asistencia}</span>
        )}
        {tiempo && (
          <span
            className={`pdv-status-chip ${item.estado_tiempo === 'retrasado' ? 'pdv-status-chip--warn' : 'pdv-status-chip--ok'}`}
          >
            {tiempo}
          </span>
        )}
      </div>

      {puedeConfirmar && (
        <button
          type="button"
          className="primary-button pdv-submit-button"
          disabled={busy}
          onClick={() => onLlegada(item.id)}
        >
          <UserCheck size={18} />
          {busy ? 'Registrando…' : 'Registrar llegada'}
        </button>
      )}
    </article>
  )
}

export function VisitasDelDiaView({ session }: Props) {
  const { contexto } = usePuntoVenta()
  const [data, setData] = useState<VisitasDelDiaResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)

  const sucursalId = contexto?.sucursal_activa?.id ?? null
  const sucursalNombre = contexto?.sucursal_activa?.nombre ?? null
  const puedeVer = contexto?.permisos.visitas_programadas_ver ?? false
  const puedeConfirmar = contexto?.permisos.visitas_programadas_confirmar_llegada ?? false

  const load = useCallback(async (silent = false) => {
    if (!sucursalId || !puedeVer) {
      setData(null)
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    try {
      setData(await obtenerVisitasDelDia(session))
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudieron cargar las visitas del día.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [puedeVer, session, sucursalId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(true), 60_000)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    if (!data?.visitas.length) return undefined

    const focusId = consumeVisitaFocusId()
    if (focusId == null) return undefined

    const frame = window.requestAnimationFrame(() => {
      const el = document.getElementById(visitaCardDomId(focusId))
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('pdv-visita-card--focus')
    })

    const timer = window.setTimeout(() => {
      document.getElementById(visitaCardDomId(focusId))?.classList.remove('pdv-visita-card--focus')
    }, 2_500)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      document.getElementById(visitaCardDomId(focusId))?.classList.remove('pdv-visita-card--focus')
    }
  }, [data])

  const onLlegada = async (visitaId: number) => {
    setConfirmando(visitaId)
    try {
      await confirmarLlegadaVisita(session, visitaId)
      await load(true)
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo registrar la llegada.'))
    } finally {
      setConfirmando(null)
    }
  }

  const visitas = data?.visitas ?? []

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--surface">
        <span className="eyebrow">PUNTO DE VENTA_</span>
        <h1>Visitas del día</h1>
        <p>Clientes con asistencia programada para hoy.</p>
      </header>

      <SucursalActivaCard />

      {contexto && !puedeVer && (
        <section className="pdv-state-card pdv-state-card--error">
          <p>Tu cuenta no tiene permiso para consultar visitas programadas.</p>
        </section>
      )}

      {puedeVer && sucursalId && (
        <section className="pdv-panel">
          <div className="pdv-section-heading">
            <div>
              <span className="pdv-kicker">Agenda</span>
              <strong>Visitas de hoy</strong>
            </div>
            <button
              aria-label="Actualizar visitas"
              className="pdv-icon-button"
              disabled={loading}
              onClick={() => void load()}
              type="button"
            >
              <RefreshCw className={loading ? 'spin' : ''} size={18} />
            </button>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          {loading && !data ? (
            <div className="pdv-loading-block">
              <RefreshCw className="spin" size={18} />
              Cargando visitas…
            </div>
          ) : (
            <div className="pdv-visita-list">
              {visitas.length === 0 && data && (
                <p className="pdv-muted">No hay visitas programadas para hoy.</p>
              )}
              {visitas.map((item) => (
                <VisitaCard
                  key={item.id}
                  busy={confirmando === item.id}
                  item={item}
                  onLlegada={onLlegada}
                  puedeConfirmar={puedeConfirmar}
                  sucursalActivaNombre={sucursalNombre}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {puedeVer && !sucursalId && (
        <p className="pdv-muted">Selecciona una sucursal activa para continuar.</p>
      )}
    </div>
  )
}
