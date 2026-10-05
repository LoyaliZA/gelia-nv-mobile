import { ArrowRight, CalendarClock, ChevronRight, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { AppRoute } from '../../app/routes'
import type { MobileSession } from '../../features/auth/auth.types'
import { mensajeErrorPdv } from '../../features/puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../../features/puntoVenta/usePuntoVenta'
import { obtenerVisitasDelDia } from '../../features/visitas/visita.api'
import { navigateToVisitas } from '../../features/visitas/visita.navigation'
import { etiquetaEstado, etiquetaTiempo } from '../../features/visitas/visita.presentacion'
import type { VisitaProgramadaItem } from '../../features/visitas/visita.types'
import { DashboardPanel } from './DashboardPanel'

const PREVIEW_LIMIT = 4
const REFRESH_MS = 60_000

interface VisitasDelDiaWidgetProps {
  onNavigate: (route: AppRoute) => void
  session: MobileSession
}

function VisitaWidgetRow({
  item,
  onSelect,
}: {
  item: VisitaProgramadaItem
  onSelect: (id: number) => void
}) {
  const tiempo = etiquetaTiempo(item.estado_tiempo)
  const nombre = item.cliente?.nombre?.trim() || 'Cliente'
  const numero = item.cliente?.numero_cliente?.trim()

  return (
    <button
      className="dashboard-visitas-widget__row"
      onClick={() => onSelect(item.id)}
      type="button"
    >
      <span className="dashboard-visitas-widget__hora">{item.hora_etiqueta}</span>
      <span className="dashboard-visitas-widget__cliente">
        <strong>{nombre}</strong>
        {numero ? <span className="dashboard-visitas-widget__numero">{numero}</span> : null}
      </span>
      <span className="dashboard-visitas-widget__meta">
        {tiempo && (
          <span
            className={`pdv-status-chip pdv-status-chip--compact ${item.estado_tiempo === 'retrasado' ? 'pdv-status-chip--warn' : 'pdv-status-chip--ok'}`}
          >
            {tiempo}
          </span>
        )}
        <span className="pdv-status-chip pdv-status-chip--compact pdv-status-chip--accent">
          {etiquetaEstado(item)}
        </span>
        <ChevronRight aria-hidden className="dashboard-visitas-widget__chevron" size={16} />
      </span>
    </button>
  )
}

export function VisitasDelDiaWidget({ onNavigate, session }: VisitasDelDiaWidgetProps) {
  const { contexto } = usePuntoVenta()
  const [visitas, setVisitas] = useState<VisitaProgramadaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sucursalId = contexto?.sucursal_activa?.id ?? null
  const puedeVer = contexto?.permisos.visitas_programadas_ver ?? false

  const load = useCallback(async (silent = false) => {
    if (!sucursalId || !puedeVer) {
      setVisitas([])
      return
    }
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await obtenerVisitasDelDia(session)
      setVisitas(data.visitas)
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
    const id = window.setInterval(() => void load(true), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  const abrirAgenda = (visitaId?: number) => {
    navigateToVisitas(onNavigate, visitaId != null ? { visitaId } : undefined)
  }

  const preview = visitas.slice(0, PREVIEW_LIMIT)
  const restantes = Math.max(0, visitas.length - preview.length)

  return (
    <DashboardPanel
      icon={CalendarClock}
      iconStyle={{ color: 'var(--color-primario)' }}
      title="Visitas de hoy_"
    >
      <div className="dashboard-visitas-widget">
        <div className="dashboard-visitas-widget__toolbar">
          <p className="dashboard-visitas-widget__hint">
            Vista rápida de la agenda en sucursal. Toca una visita para registrar llegada.
          </p>
          <button
            aria-label="Actualizar visitas del día"
            className="pdv-icon-button dashboard-visitas-widget__refresh"
            disabled={loading || !sucursalId || !puedeVer}
            onClick={() => void load()}
            type="button"
          >
            <RefreshCw className={loading ? 'spin' : ''} size={16} />
          </button>
        </div>

        {!contexto && (
          <p className="dashboard-empty">Cargando contexto de punto de venta…</p>
        )}

        {contexto && !puedeVer && (
          <p className="dashboard-empty">Sin permiso para consultar visitas programadas.</p>
        )}

        {contexto && puedeVer && !sucursalId && (
          <p className="dashboard-empty">Selecciona una sucursal activa para ver la agenda.</p>
        )}

        {contexto && puedeVer && sucursalId && error && (
          <p className="form-error" role="alert">{error}</p>
        )}

        {contexto && puedeVer && sucursalId && loading && visitas.length === 0 && !error && (
          <div className="dashboard-visitas-widget__loading">
            <RefreshCw aria-hidden className="spin" size={16} />
            Cargando visitas…
          </div>
        )}

        {contexto && puedeVer && sucursalId && !loading && visitas.length === 0 && !error && (
          <p className="dashboard-empty">No hay visitas programadas para hoy.</p>
        )}

        {preview.length > 0 && (
          <div className="dashboard-visitas-widget__list">
            {preview.map((item) => (
              <VisitaWidgetRow
                key={item.id}
                item={item}
                onSelect={(id) => abrirAgenda(id)}
              />
            ))}
          </div>
        )}

        {visitas.length > 0 && (
          <button
            className="dashboard-visitas-widget__footer"
            onClick={() => abrirAgenda()}
            type="button"
          >
            <span>
              {restantes > 0
                ? `Ver agenda completa (+${restantes} más)`
                : `Ver agenda completa (${visitas.length})`}
            </span>
            <ArrowRight aria-hidden size={16} />
          </button>
        )}
      </div>
    </DashboardPanel>
  )
}
