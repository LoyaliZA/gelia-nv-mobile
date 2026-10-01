import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MobileSession } from '../auth/auth.types'
import { SucursalActivaCard } from '../puntoVenta/SucursalActivaCard'
import { PDV_PERMISSION, puedeConfirmarCustodiaResguardo } from '../puntoVenta/puntoVentaAccess'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../puntoVenta/usePuntoVenta'
import { listarResguardos, obtenerDetalleResguardo } from './resguardo.api'
import type {
  ResguardoBandeja,
  ResguardoDetalleResponse,
  ResguardoListItem,
  ResguardoListResponse,
  ResguardoPaso,
} from './resguardo.types'
import { AltaResguardoSheet } from './AltaResguardoSheet'
import { ResguardoDetailSheet } from './ResguardoDetailSheet'

interface Props {
  session: MobileSession
}

const BANDEJAS: Array<{ value: ResguardoBandeja; label: string }> = [
  { value: 'por_recibir', label: 'Por recibir' },
  { value: 'en_custodia', label: 'En custodia' },
  { value: 'incidencias', label: 'Incidencias' },
]

function referencia(item: ResguardoListItem) {
  return item.snapshot_folio
    || item.pedido?.folio
    || item.pedido?.folio_remision
    || `Resguardo #${item.id}`
}

function cliente(item: ResguardoListItem) {
  return item.snapshot_cliente_nombre || item.cliente?.nombre || 'Cliente sin nombre'
}

export function ResguardosView({ session }: Props) {
  const { contexto } = usePuntoVenta()
  const [bandeja, setBandeja] = useState<ResguardoBandeja>('por_recibir')
  const [paso, setPaso] = useState<ResguardoPaso>('gerente')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ResguardoListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ResguardoDetalleResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [altaOpen, setAltaOpen] = useState(false)

  const sucursalId = contexto?.sucursal_activa?.id ?? null
  const permiso = contexto?.permisos.resguardos_ver ?? false
  const tienePermiso = (clave: boolean | undefined, permiso: string) => Boolean(
    clave && session.permissions.includes(permiso),
  )
  const puedeAltaManual = Boolean(
    sucursalId
    && contexto?.registro_manual
    && tienePermiso(contexto?.permisos.resguardos_registrar_manual, PDV_PERMISSION.resguardosRegistrarManual),
  )
  const puedePasoGerencia = tienePermiso(contexto?.permisos.resguardos_confirmar_llegada, PDV_PERMISSION.resguardosConfirmarLlegada)
    || tienePermiso(contexto?.permisos.resguardos_enviar_a_custodia, PDV_PERMISSION.resguardosEnviarACustodia)
  const puedePasoRecepcion = tienePermiso(
    contexto?.permisos.resguardos_confirmar_custodia ?? puedeConfirmarCustodiaResguardo(session.permissions),
    PDV_PERMISSION.resguardosConfirmarCustodia,
  )
  const pasoConsulta: ResguardoPaso | undefined = puedePasoGerencia && puedePasoRecepcion
    ? paso
    : puedePasoGerencia
      ? 'gerente'
      : puedePasoRecepcion
        ? 'recepcionista'
        : undefined

  const load = useCallback(async (silent = false) => {
    if (!sucursalId || !permiso) {
      setData(null)
      return
    }

    if (!silent) setLoading(true)
    setError(null)

    try {
      const response = await listarResguardos(session, {
        bandeja,
        paso: bandeja === 'por_recibir' ? pasoConsulta : undefined,
        q: appliedQuery,
        page,
        perPage: 15,
      })
      setData(response)
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo cargar la bandeja de resguardos.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [appliedQuery, bandeja, page, pasoConsulta, permiso, session, sucursalId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!sucursalId || !permiso) return
    const timer = window.setInterval(() => void load(true), 20_000)
    return () => window.clearInterval(timer)
  }, [load, permiso, sucursalId])

  const loadDetail = useCallback(async () => {
    if (!detailId) return
    setDetailLoading(true)
    setDetailError(null)
    try {
      setDetail(await obtenerDetalleResguardo(session, detailId))
    } catch (err) {
      setDetailError(mensajeErrorPdv(err, 'No se pudo cargar el resguardo.'))
    } finally {
      setDetailLoading(false)
    }
  }, [detailId, session])

  useEffect(() => {
    if (detailId) void loadDetail()
  }, [detailId, loadDetail])

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setDetailError(null)
  }

  const changed = async () => {
    await Promise.all([load(true), loadDetail()])
  }

  const search = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setAppliedQuery(query.trim())
  }

  const paginator = data?.resguardos
  const items = paginator?.data ?? []

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--surface">
        <span className="eyebrow">PUNTO DE VENTA_</span>
        <h1>Resguardos</h1>
        <p>Consulta la cadena de recepción, custodia e incidencias de la sucursal activa.</p>
      </header>

      <SucursalActivaCard />

      {puedeAltaManual && (
        <button className="primary-button" onClick={() => setAltaOpen(true)} type="button">
          Registrar recepción
          <Camera size={18} />
        </button>
      )}

      {contexto && !permiso && (
        <section className="pdv-state-card pdv-state-card--error">
          <p>Tu cuenta no tiene permiso para consultar resguardos en esta sucursal.</p>
        </section>
      )}

      {permiso && sucursalId && (
        <>
          <section className="pdv-toolbar">
            <div className="pdv-tabs" role="tablist" aria-label="Bandeja de resguardos">
              {BANDEJAS.map((item) => (
                <button
                  aria-selected={bandeja === item.value}
                  key={item.value}
                  onClick={() => {
                    setBandeja(item.value)
                    setPage(1)
                  }}
                  role="tab"
                  type="button"
                >
                  {item.label}
                  {typeof data?.metricas[item.value] === 'number'
                    ? <span>{data.metricas[item.value]}</span>
                    : null}
                </button>
              ))}
            </div>

            {bandeja === 'por_recibir' && puedePasoGerencia && puedePasoRecepcion && (
              <div className="pdv-segmented" role="tablist" aria-label="Paso de recepción">
                <button aria-pressed={pasoConsulta === 'gerente'} onClick={() => { setPaso('gerente'); setPage(1) }} type="button">
                  Confirmar llegada
                </button>
                <button aria-pressed={pasoConsulta === 'recepcionista'} onClick={() => { setPaso('recepcionista'); setPage(1) }} type="button">
                  Custodia recepción
                </button>
              </div>
            )}

            <form className="pdv-search" onSubmit={search}>
              <Search size={17} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Folio, cliente o referencia"
                value={query}
              />
              <button className="secondary-button" type="submit">Buscar</button>
            </form>
          </section>

          {error && (
            <section className="pdv-state-card pdv-state-card--error">
              <p>{error}</p>
              <button className="secondary-button" onClick={() => void load()} type="button">
                <RefreshCw size={15} /> Reintentar
              </button>
            </section>
          )}

          <section className="pdv-list-section">
            <div className="pdv-section-heading">
              <div>
                <span className="pdv-kicker">Bandeja</span>
                <strong>{paginator?.total ?? 0} resguardo{(paginator?.total ?? 0) === 1 ? '' : 's'}</strong>
              </div>
              <button aria-label="Actualizar" className="pdv-icon-button" disabled={loading} onClick={() => void load()} type="button">
                <RefreshCw className={loading ? 'spin' : ''} size={18} />
              </button>
            </div>

            {loading && !data ? (
              <div className="pdv-loading-block"><RefreshCw className="spin" /> Cargando resguardos…</div>
            ) : items.length === 0 ? (
              <div className="pdv-empty">
                <Package />
                <strong>Sin resguardos en esta bandeja</strong>
                <span>Los registros de la sucursal activa aparecerán aquí.</span>
              </div>
            ) : (
              <div className="pdv-card-list">
                {items.map((item) => (
                  <button
                    className="pdv-resguardo-card"
                    key={item.id}
                    onClick={() => {
                      setDetail(null)
                      setDetailId(item.id)
                    }}
                    type="button"
                  >
                    <div className="pdv-resguardo-card__top">
                      <span className="pdv-status-chip">{item.estado_etiqueta}</span>
                      <span className="pdv-resguardo-card__folio">{referencia(item)}</span>
                    </div>
                    <strong>{cliente(item)}</strong>
                    <div className="pdv-resguardo-card__meta">
                      <span>{item.cliente?.numero_cliente ? `#${item.cliente.numero_cliente}` : 'Sin número de cliente'}</span>
                      <span>{item.cantidad_bultos_recibida}/{item.cantidad_bultos_esperada} bultos</span>
                      {item.incidencias_abiertas_count > 0 && <span>{item.incidencias_abiertas_count} incidencia(s)</span>}
                    </div>
                    {item.clasificaciones_etiquetas?.length > 0 && (
                      <div className="pdv-chip-row">
                        {item.clasificaciones_etiquetas.map((tag) => <span className="pdv-alert-chip" key={tag}>{tag}</span>)}
                      </div>
                    )}
                    <ChevronRight className="pdv-resguardo-card__arrow" />
                  </button>
                ))}
              </div>
            )}

            {paginator && paginator.last_page > 1 && (
              <div className="pdv-pagination">
                <button
                  className="secondary-button"
                  disabled={paginator.current_page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span>{paginator.current_page} / {paginator.last_page}</span>
                <button
                  className="secondary-button"
                  disabled={paginator.current_page >= paginator.last_page || loading}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {altaOpen && (
        <AltaResguardoSheet
          origenes={contexto?.origenes ?? []}
          session={session}
          onClose={() => setAltaOpen(false)}
          onSuccess={() => {
            setBandeja('por_recibir')
            setPaso('gerente')
            setPage(1)
            return load(true)
          }}
        />
      )}

      {detailId && (
        <ResguardoDetailSheet
          detail={detail}
          error={detailError}
          loading={detailLoading}
          onChanged={changed}
          onClose={closeDetail}
          onReload={loadDetail}
          session={session}
        />
      )}
    </div>
  )
}
