import { RefreshCw, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { MobileSession } from '../auth/auth.types'
import { SucursalActivaCard } from '../puntoVenta/SucursalActivaCard'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../puntoVenta/usePuntoVenta'
import { confirmarLlegadaVisita, obtenerVisitasDelDia } from './visita.api'
import type { VisitaProgramadaItem, VisitasDelDiaResponse } from './visita.types'

interface Props {
  session: MobileSession
}

function etiquetaTiempo(estado: VisitaProgramadaItem['estado_tiempo']) {
  if (estado === 'retrasado') return 'Retrasado'
  if (estado === 'en_tiempo') return 'En tiempo'
  return null
}

function VisitaCard({
  item,
  puedeConfirmar,
  busy,
  onLlegada,
}: {
  item: VisitaProgramadaItem
  puedeConfirmar: boolean
  busy: boolean
  onLlegada: (id: number) => void
}) {
  const tiempo = etiquetaTiempo(item.estado_tiempo)

  return (
    <article className="pdv-turno-card pdv-visita-card">
      <div className="pdv-visita-card__header">
        <div>
          <div className="pdv-visita-card__nombre">{item.cliente?.nombre ?? 'Cliente'}</div>
          <div className="pdv-visita-card__numero">{item.cliente?.numero_cliente}</div>
        </div>
        {tiempo && (
          <span className={`pdv-status-chip ${item.estado_tiempo === 'retrasado' ? 'pdv-status-chip--warn' : 'pdv-status-chip--ok'}`}>
            {tiempo}
          </span>
        )}
      </div>
      <p className="pdv-visita-card__hora">{item.hora_etiqueta}</p>
      <p className="pdv-visita-card__meta">
        Registró: <strong>{item.registrado_por?.nombre ?? '—'}</strong>
      </p>
      {item.registrado_por?.departamento && (
        <p className="pdv-visita-card__meta">Departamento: {item.registrado_por.departamento}</p>
      )}
      {puedeConfirmar && (
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => onLlegada(item.id)}
        >
          <UserCheck size={18} />
          Registrar llegada
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
        <p className="eyebrow">PUNTO DE VENTA_</p>
        <h1>Visitas del día</h1>
        <p className="page-heading__lead">Clientes con asistencia programada para hoy.</p>
      </header>

      <SucursalActivaCard />

      <div className="page-toolbar">
        <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && !data && <p className="theme-muted">Cargando visitas…</p>}

      {!sucursalId && (
        <p className="theme-muted">Selecciona una sucursal activa para continuar.</p>
      )}

      <div className="pdv-visita-list">
        {visitas.length === 0 && data && sucursalId && (
          <p className="theme-muted">No hay visitas programadas para hoy.</p>
        )}
        {visitas.map((item) => (
          <VisitaCard
            key={item.id}
            item={item}
            puedeConfirmar={puedeConfirmar}
            busy={confirmando === item.id}
            onLlegada={onLlegada}
          />
        ))}
      </div>
    </div>
  )
}
