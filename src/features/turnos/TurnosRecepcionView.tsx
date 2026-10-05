import {
  Clock3,
  RefreshCw,
  Search,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ClienteMovil } from '../clientes/cliente.types'
import { puedeConsultarClientesMovil } from '../clientes/mobileClienteAccess'
import { useClienteSync } from '../clientes/useClienteSync'
import type { MobileSession } from '../auth/auth.types'
import { SucursalActivaCard } from '../puntoVenta/SucursalActivaCard'
import {
  puedeAltaVisitanteConClienteTitularMovil,
  puedeMarcarPrioridadTurnoMovil,
} from '../puntoVenta/puntoVentaAccess'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../puntoVenta/usePuntoVenta'
import { obtenerRecepcionTurnos, registrarTurno } from './turno.api'
import type { TurnoRecepcionItem, TurnosRecepcionResponse } from './turno.types'

interface Props {
  session: MobileSession
}

type AltaMode = 'cliente' | 'visitante'

function espera(segundos: number | null) {
  if (segundos === null) return '—'
  const min = Math.max(0, Math.floor(segundos / 60))
  if (min < 1) return '< 1 min'
  if (min < 60) return `${min} min`
  const horas = Math.floor(min / 60)
  return `${horas} h ${min % 60} min`
}

function prioridad(turno: TurnoRecepcionItem) {
  const tags: string[] = []
  if (turno.prioridad_diamante) tags.push('Diamante')
  if (turno.prioridad_vip) tags.push('VIP')
  if (turno.prioridad_adulto_mayor) tags.push('Adulto mayor')
  if (turno.prioridad_discapacidad) tags.push('Discapacidad')
  return tags
}

function BloqueBusquedaCliente({
  clienteSelected,
  clienteQuery,
  clienteResults,
  searchingCliente,
  onBuscar,
  onQueryChange,
  onSelect,
  onClear,
}: {
  clienteSelected: ClienteMovil | null
  clienteQuery: string
  clienteResults: ClienteMovil[]
  searchingCliente: boolean
  onBuscar: () => void
  onQueryChange: (value: string) => void
  onSelect: (cliente: ClienteMovil) => void
  onClear: () => void
}) {
  if (clienteSelected) {
    return (
      <div className="pdv-selected-client">
        <div>
          <span>#{clienteSelected.numero_cliente}</span>
          <strong>{clienteSelected.nombre}</strong>
        </div>
        <button className="secondary-button" onClick={onClear} type="button">
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="pdv-client-search">
        <Search size={17} />
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Nombre o número de cliente"
          value={clienteQuery}
        />
        <button className="secondary-button" disabled={searchingCliente} onClick={onBuscar} type="button">
          {searchingCliente ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
      {clienteResults.length > 0 && (
        <div className="pdv-client-results">
          {clienteResults.map((cliente) => (
            <button key={cliente.id} onClick={() => onSelect(cliente)} type="button">
              <span>#{cliente.numero_cliente}</span>
              <strong>{cliente.nombre}</strong>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function TurnoCard({ item, asignado = false }: { item: TurnoRecepcionItem; asignado?: boolean }) {
  const priorities = prioridad(item)

  return (
    <article className="pdv-turno-card">
      <div className="pdv-turno-card__folio">{item.folio}</div>
      <div className="pdv-turno-card__body">
        <strong>{item.snapshot_nombre_llamado || 'Sin nombre de llamado'}</strong>
        <span>{item.servicio || 'Ventas'} · espera {espera(item.espera_segundos)}</span>
        {asignado && (
          <small>
            {item.atencion?.primer_nombre
              ? `Asignado a ${item.atencion.primer_nombre}`
              : 'Asignado'}
            {item.atencion?.atencion_en_curso ? ' · En atención' : ''}
          </small>
        )}
        {priorities.length > 0 && (
          <div className="pdv-chip-row">
            {priorities.map((tag) => <span className="pdv-alert-chip" key={tag}>{tag}</span>)}
          </div>
        )}
      </div>
      <span className="pdv-status-chip">{asignado ? 'Asignado' : 'En cola'}</span>
    </article>
  )
}

export function TurnosRecepcionView({ session }: Props) {
  const { contexto } = usePuntoVenta()
  const { searchClientes } = useClienteSync()
  const [data, setData] = useState<TurnosRecepcionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<AltaMode>(
    puedeConsultarClientesMovil(session.permissions) ? 'cliente' : 'visitante',
  )
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResults, setClienteResults] = useState<ClienteMovil[]>([])
  const [clienteSelected, setClienteSelected] = useState<ClienteMovil | null>(null)
  const [searchingCliente, setSearchingCliente] = useState(false)
  const [nombreVisitante, setNombreVisitante] = useState('')
  const [prioridadAdulto, setPrioridadAdulto] = useState(false)
  const [prioridadDiscapacidad, setPrioridadDiscapacidad] = useState(false)
  const [altaError, setAltaError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const sucursalId = contexto?.sucursal_activa?.id ?? null
  const puedeVer = contexto?.permisos.turnos_ver ?? false
  const puedeAlta = Boolean(contexto?.permisos.turnos_alta)
  const puedePrioridad = puedeMarcarPrioridadTurnoMovil(session.permissions)
  const puedeBuscarCliente = puedeConsultarClientesMovil(session.permissions)
  const puedeRepresentante = Boolean(
    contexto?.permisos.turnos_alta_representante
      ?? puedeAltaVisitanteConClienteTitularMovil(session.permissions),
  )

  const load = useCallback(async (silent = false) => {
    if (!sucursalId || !puedeVer) {
      setData(null)
      return
    }

    if (!silent) setLoading(true)
    setError(null)
    try {
      setData(await obtenerRecepcionTurnos(session))
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo cargar la recepción de turnos.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [puedeVer, session, sucursalId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!sucursalId || !puedeVer) return
    const timer = window.setInterval(() => void load(true), 15_000)
    return () => window.clearInterval(timer)
  }, [load, puedeVer, sucursalId])

  const turnosActivosCliente = useMemo(() => {
    if (!clienteSelected?.id || !data) return null
    return [...data.en_cola, ...data.asignados]
      .find((turno) => Number(turno.cliente_id) === Number(clienteSelected.id)) ?? null
  }, [clienteSelected, data])

  const limpiarClienteAlta = () => {
    setClienteSelected(null)
    setClienteResults([])
    setClienteQuery('')
  }

  const cambiarModo = (nuevo: AltaMode) => {
    setMode(nuevo)
    setAltaError(null)
    limpiarClienteAlta()
    setNombreVisitante('')
    setPrioridadAdulto(false)
    setPrioridadDiscapacidad(false)
  }

  const seleccionarCliente = (cliente: ClienteMovil) => {
    setClienteSelected(cliente)
    setAltaError(null)
    if (!data) return
    const turnoExistente = [...data.en_cola, ...data.asignados]
      .find((turno) => Number(turno.cliente_id) === Number(cliente.id))
    if (turnoExistente) {
      const estado = turnoExistente.estado === 'ASIGNADO' ? 'asignado' : 'en cola'
      const folio = turnoExistente.folio ? ` (${turnoExistente.folio})` : ''
      setAltaError(`Esta persona ya tiene un turno ${estado}${folio}. No es necesario registrarlo de nuevo.`)
    }
  }

  const buscarCliente = async () => {
    const q = clienteQuery.trim()
    if (!q || !puedeBuscarCliente) return

    setSearchingCliente(true)
    setAltaError(null)
    try {
      const result = await searchClientes(q, 1)
      setClienteResults(result.data.slice(0, 8))
    } catch {
      setAltaError('No se pudo buscar clientes en este momento.')
    } finally {
      setSearchingCliente(false)
    }
  }

  const crear = async (event: FormEvent) => {
    event.preventDefault()
    if (!puedeAlta || creating) return

    setAltaError(null)

    if (mode === 'cliente' && !clienteSelected?.id) {
      setAltaError('Selecciona un cliente registrado.')
      return
    }
    if (mode === 'cliente' && turnosActivosCliente) {
      setAltaError(`Este cliente ya tiene el turno ${turnosActivosCliente.folio} activo.`)
      return
    }
    if (mode === 'visitante') {
      if (nombreVisitante.trim().length < 2) {
        setAltaError('Captura el nombre del visitante (se mostrará en pantalla de turnos).')
        return
      }
      if (!puedeRepresentante) {
        setAltaError('Para registrar visitantes con número de cliente titular, solicita el permiso de alta con cliente.')
        return
      }
      if (!clienteSelected?.id) {
        setAltaError('Selecciona el número de cliente titular usado por el visitante.')
        return
      }
      if (turnosActivosCliente) {
        setAltaError(`Este cliente ya tiene el turno ${turnosActivosCliente.folio} activo.`)
        return
      }
    }

    setCreating(true)
    try {
      await registrarTurno(session, {
        clienteId: clienteSelected?.id ?? null,
        nombreLlamado: mode === 'visitante' ? nombreVisitante.trim() : null,
        prioridadAdultoMayor: puedePrioridad ? prioridadAdulto : false,
        prioridadDiscapacidad: puedePrioridad ? prioridadDiscapacidad : false,
      })

      limpiarClienteAlta()
      setNombreVisitante('')
      setPrioridadAdulto(false)
      setPrioridadDiscapacidad(false)
      await load(true)
    } catch (err) {
      setAltaError(mensajeErrorPdv(err, 'No se pudo registrar el turno.'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--surface">
        <span className="eyebrow">PUNTO DE VENTA_</span>
        <h1>Recepción de turnos</h1>
        <p>Registra personas para atención y consulta el estado actual de la fila de ventas.</p>
      </header>

      <SucursalActivaCard />

      {contexto && !puedeVer && !puedeAlta && (
        <section className="pdv-state-card pdv-state-card--error">
          <p>Tu cuenta no tiene permiso para consultar turnos.</p>
        </section>
      )}

      {puedeAlta && sucursalId && (
        <section className="pdv-panel">
          <div className="pdv-section-heading">
            <div>
              <span className="pdv-kicker">Alta</span>
              <strong>Nuevo turno</strong>
            </div>
            <Ticket size={20} />
          </div>

          <form className="pdv-form" onSubmit={(event) => void crear(event)}>
            <div className="pdv-segmented">
              {puedeBuscarCliente && (
                <button aria-pressed={mode === 'cliente'} onClick={() => cambiarModo('cliente')} type="button">
                  Cliente
                </button>
              )}
              <button aria-pressed={mode === 'visitante'} onClick={() => cambiarModo('visitante')} type="button">
                Visitante
              </button>
            </div>

            {mode === 'cliente' && puedeBuscarCliente ? (
              <BloqueBusquedaCliente
                clienteQuery={clienteQuery}
                clienteResults={clienteResults}
                clienteSelected={clienteSelected}
                onBuscar={() => void buscarCliente()}
                onClear={limpiarClienteAlta}
                onQueryChange={setClienteQuery}
                onSelect={seleccionarCliente}
                searchingCliente={searchingCliente}
              />
            ) : null}

            {mode === 'visitante' ? (
              <div className="pdv-visitante-alta">
                <label>
                  Nombre del visitante
                  <input
                    autoComplete="name"
                    maxLength={255}
                    onChange={(event) => setNombreVisitante(event.target.value)}
                    placeholder="Nombre que se mostrará en la pantalla de turnos"
                    value={nombreVisitante}
                  />
                </label>
                <p className="pdv-muted">
                  En sala y en el tablero se anuncia este nombre, no el del titular del número.
                </p>

                {puedeRepresentante ? (
                  <div className="pdv-visitante-cliente-block">
                    <p className="pdv-kicker">Número de cliente titular</p>
                    <p className="pdv-muted">
                      Busca el número de cliente con el que entró el visitante para ligar el turno a esa cuenta.
                    </p>
                    {puedeBuscarCliente ? (
                      <BloqueBusquedaCliente
                        clienteQuery={clienteQuery}
                        clienteResults={clienteResults}
                        clienteSelected={clienteSelected}
                        onBuscar={() => void buscarCliente()}
                        onClear={limpiarClienteAlta}
                        onQueryChange={setClienteQuery}
                        onSelect={seleccionarCliente}
                        searchingCliente={searchingCliente}
                      />
                    ) : (
                      <p className="form-error" role="alert">
                        Necesitas permiso de consulta de clientes en móvil para buscar el número titular.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="pdv-muted">
                    Para registrar visitantes con número de cliente titular, solicita el permiso de alta con cliente.
                  </p>
                )}
              </div>
            ) : null}

            {puedePrioridad && (
              <fieldset className="pdv-priority-fieldset">
                <legend>Prioridad autorizada</legend>
                <label>
                  <input checked={prioridadAdulto} onChange={(event) => setPrioridadAdulto(event.target.checked)} type="checkbox" />
                  Adulto mayor
                </label>
                <label>
                  <input checked={prioridadDiscapacidad} onChange={(event) => setPrioridadDiscapacidad(event.target.checked)} type="checkbox" />
                  Discapacidad / movilidad
                </label>
              </fieldset>
            )}

            {turnosActivosCliente && (
              <p className="form-error">Este cliente ya tiene el turno {turnosActivosCliente.folio} activo.</p>
            )}
            {altaError && <p className="form-error" role="alert">{altaError}</p>}

            <button
              className="primary-button pdv-submit-button"
              disabled={
                creating
                || Boolean(turnosActivosCliente)
                || (mode === 'visitante' && (!puedeRepresentante || (puedeRepresentante && puedeBuscarCliente && !clienteSelected)))
              }
              type="submit"
            >
              {creating ? 'Registrando…' : 'Registrar turno'}
            </button>
          </form>
        </section>
      )}

      {puedeVer && sucursalId && (
        <>
          <section className="pdv-summary-grid">
            <div><Users /><span>En espera</span><strong>{data?.resumen.en_espera ?? 0}</strong></div>
            <div><UserCheck /><span>Asignados</span><strong>{data?.resumen.asignados ?? 0}</strong></div>
            <div><Clock3 /><span>Mayor espera</span><strong>{espera(data?.resumen.mayor_espera_segundos ?? 0)}</strong></div>
            <div><UserCheck /><span>Disponibles</span><strong>{data?.resumen.vendedores_disponibles ?? 0}</strong></div>
          </section>

          <section className="pdv-panel">
            <div className="pdv-section-heading">
              <div>
                <span className="pdv-kicker">Fila de ventas</span>
                <strong>Turnos activos</strong>
              </div>
              <button aria-label="Actualizar" className="pdv-icon-button" disabled={loading} onClick={() => void load()} type="button">
                <RefreshCw className={loading ? 'spin' : ''} size={18} />
              </button>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}

            {loading && !data ? (
              <div className="pdv-loading-block"><RefreshCw className="spin" /> Cargando turnos…</div>
            ) : (
              <>
                <div className="pdv-turno-group">
                  <h3>En espera ({data?.en_cola.length ?? 0})</h3>
                  {(data?.en_cola.length ?? 0) === 0
                    ? <p className="pdv-muted">No hay personas esperando.</p>
                    : data?.en_cola.map((item) => <TurnoCard item={item} key={item.id} />)}
                </div>

                <div className="pdv-turno-group">
                  <h3>Asignados ({data?.asignados.length ?? 0})</h3>
                  {(data?.asignados.length ?? 0) === 0
                    ? <p className="pdv-muted">No hay turnos asignados.</p>
                    : data?.asignados.map((item) => <TurnoCard asignado item={item} key={item.id} />)}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
