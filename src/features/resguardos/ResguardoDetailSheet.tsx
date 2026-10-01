import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  X,
} from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { PDV_PERMISSION } from '../puntoVenta/puntoVentaAccess'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { usePuntoVenta } from '../puntoVenta/usePuntoVenta'
import {
  confirmarRecepcionResguardo,
  pasarResguardoARecepcion,
} from './resguardo.api'
import type { ResguardoDetalleResponse } from './resguardo.types'
import { CustodiaResguardoSheet } from './CustodiaResguardoSheet'
import { entregaEsTercero, EntregaResguardoSheet, nombreClienteResguardo } from './EntregaResguardoSheet'
import { ContenidoResguardoPanel } from './ContenidoResguardoPanel'
import { ModalPortal } from '../../components/ui/ModalPortal'

interface Props {
  detail: ResguardoDetalleResponse | null
  error: string | null
  loading: boolean
  session: MobileSession
  onClose: () => void
  onReload: () => Promise<void>
  onChanged: () => Promise<void>
}

function fecha(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed)
}

export function ResguardoDetailSheet({
  detail,
  error,
  loading,
  session,
  onClose,
  onReload,
  onChanged,
}: Props) {
  const { contexto } = usePuntoVenta()
  const [procesando, setProcesando] = useState<string | null>(null)
  const [accionError, setAccionError] = useState<string | null>(null)
  const [entregaOpen, setEntregaOpen] = useState(false)
  const [custodiaOpen, setCustodiaOpen] = useState(false)

  const resguardo = detail?.resguardo
  const tienePermiso = (clave: boolean | undefined, permiso: string) => Boolean(
    clave && session.permissions.includes(permiso),
  )
  const puedeRecibir = Boolean(
    resguardo?.admite_recepcion
    && tienePermiso(contexto?.permisos.resguardos_confirmar_llegada, PDV_PERMISSION.resguardosConfirmarLlegada),
  )
  const puedePasar = Boolean(
    resguardo?.admite_pasar_a_recepcion
    && tienePermiso(contexto?.permisos.resguardos_enviar_a_custodia, PDV_PERMISSION.resguardosEnviarACustodia),
  )
  const permisoConfirmarCustodia = contexto?.permisos.resguardos_confirmar_custodia
    ?? session.permissions.includes(PDV_PERMISSION.resguardosConfirmarCustodia)
  const admiteConfirmacionCustodia = resguardo?.admite_confirmacion_custodia
    ?? (resguardo?.estado === 'en_recepcion' ? true : false)
  const puedeConfirmarCustodia = Boolean(
    admiteConfirmacionCustodia
    && permisoConfirmarCustodia
    && session.permissions.includes(PDV_PERMISSION.resguardosConfirmarCustodia),
  )
  const puedeEntregar = Boolean(
    resguardo
    && resguardo.estado === 'en_custodia'
    && !resguardo.entrega_bloqueada
    && tienePermiso(contexto?.permisos.resguardos_entregar, PDV_PERMISSION.resguardosEntregar),
  )

  const ejecutar = async (accion: 'recepcion' | 'pasar') => {
    if (!resguardo || procesando) return

    setProcesando(accion)
    setAccionError(null)

    try {
      if (accion === 'recepcion') {
        await confirmarRecepcionResguardo(session, resguardo.id, resguardo.version)
      } else {
        await pasarResguardoARecepcion(session, resguardo.id, resguardo.version)
      }

      await onChanged()
    } catch (err) {
      setAccionError(mensajeErrorPdv(err))
      await onReload()
    } finally {
      setProcesando(null)
    }
  }

  return (
    <>
      <ModalPortal>
      <div className="pdv-overlay" role="presentation">
        <section aria-modal="true" className="pdv-sheet pdv-sheet--detail" role="dialog">
          <header className="pdv-sheet__header">
            <div>
              <span className="pdv-kicker">Detalle de resguardo</span>
              <h2>{resguardo?.snapshot_folio || (resguardo ? `Resguardo #${resguardo.id}` : 'Resguardo')}</h2>
            </div>
            <button aria-label="Cerrar" className="pdv-icon-button" onClick={onClose} type="button">
              <X size={19} />
            </button>
          </header>

          {loading && !detail && (
            <div className="pdv-loading-block"><LoaderCircle className="spin" /> Cargando detalle…</div>
          )}

          {error && !detail && (
            <div className="pdv-state-card pdv-state-card--error">
              <p>{error}</p>
              <button className="secondary-button" onClick={() => void onReload()} type="button">
                <RefreshCw size={15} /> Reintentar
              </button>
            </div>
          )}

          {resguardo && (
            <div className="pdv-detail">
              <div className="pdv-detail__hero">
                <div>
                  <span className="pdv-status-chip">{resguardo.estado_etiqueta}</span>
                  <h3>{resguardo.snapshot_cliente_nombre || resguardo.cliente?.nombre || 'Cliente sin nombre'}</h3>
                  <p>{resguardo.referencia_cliente || (resguardo.cliente ? `#${resguardo.cliente.numero_cliente}` : 'Sin referencia')}</p>
                </div>
                <strong>{resguardo.cantidad_bultos_recibida}/{resguardo.cantidad_bultos_esperada}</strong>
              </div>

              <dl className="pdv-detail-grid">
                <div><dt>Sucursal</dt><dd>{resguardo.sucursal?.nombre || '—'}</dd></div>
                <div><dt>Pedido</dt><dd>{resguardo.pedido?.folio || resguardo.pedido?.folio_remision || '—'}</dd></div>
                <div><dt>Salida CEDIS</dt><dd>{fecha(resguardo.salida_cedis_at)}</dd></div>
                <div><dt>Recepción física</dt><dd>{fecha(resguardo.recepcion_fisica_at)}</dd></div>
                <div>
                  <dt>Quien recibe</dt>
                  <dd>
                    {entregaEsTercero(resguardo)
                      ? (resguardo.envia_otra_persona?.trim() || 'Tercero')
                      : (nombreClienteResguardo(resguardo) || 'Cliente titular')}
                  </dd>
                </div>
              </dl>

              {resguardo.clasificaciones_etiquetas?.length > 0 && (
                <div className="pdv-chip-row">
                  {resguardo.clasificaciones_etiquetas.map((etiqueta) => (
                    <span className="pdv-alert-chip" key={etiqueta}>{etiqueta}</span>
                  ))}
                </div>
              )}

              <ContenidoResguardoPanel
                mostrarEntrega
                resguardo={resguardo}
                timeline={detail.timeline}
                token={session.accessToken}
              />

              <section className="pdv-detail-section">
                <h4>Bultos</h4>
                {resguardo.bultos.length === 0 ? (
                  <p className="pdv-muted">Sin bultos registrados.</p>
                ) : (
                  <div className="pdv-mini-list">
                    {resguardo.bultos.map((bulto) => (
                      <div className="pdv-mini-row" key={bulto.id}>
                        <div>
                          <strong>{bulto.folio || `Bulto #${bulto.id}`}</strong>
                          <span>{bulto.tipo || 'Bulto'} · {bulto.estado || 'Sin estado'}</span>
                        </div>
                        {bulto.entrega_at ? <PackageCheck size={17} /> : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {detail.timeline.length > 0 && (
                <section className="pdv-detail-section">
                  <h4>Línea de tiempo</h4>
                  <ol className="pdv-timeline">
                    {detail.timeline.slice().reverse().slice(0, 12).map((item) => (
                      <li key={item.id}>
                        <span />
                        <div>
                          <strong>{item.tipo_etiqueta || item.tipo_evento || 'Evento'}</strong>
                          <small>{fecha(item.ocurrido_at)}{item.actor_referencia ? ` · ${item.actor_referencia}` : ''}</small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {accionError && <p className="form-error" role="alert">{accionError}</p>}

              <div className="pdv-action-stack">
                {puedeRecibir && (
                  <button
                    className="primary-button pdv-action-button"
                    disabled={Boolean(procesando)}
                    onClick={() => void ejecutar('recepcion')}
                    type="button"
                  >
                    {procesando === 'recepcion' ? <LoaderCircle className="spin" /> : <CheckCircle2 />}
                    Confirmar recepción física
                  </button>
                )}
                {puedePasar && (
                  <button
                    className="secondary-button pdv-action-button"
                    disabled={Boolean(procesando)}
                    onClick={() => void ejecutar('pasar')}
                    type="button"
                  >
                    {procesando === 'pasar' ? <LoaderCircle className="spin" /> : <ArrowRight />}
                    Pasar a recepción
                  </button>
                )}
                {puedeConfirmarCustodia && (
                  <button
                    className="primary-button pdv-action-button"
                    disabled={Boolean(procesando)}
                    onClick={() => setCustodiaOpen(true)}
                    type="button"
                  >
                    <PackageCheck />
                    Confirmar custodia
                  </button>
                )}
                {puedeEntregar && (
                  <button
                    className="primary-button pdv-action-button"
                    disabled={Boolean(procesando)}
                    onClick={() => setEntregaOpen(true)}
                    type="button"
                  >
                    <PackageCheck /> Registrar entrega
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
      </ModalPortal>

      {resguardo && (
        <>
          <CustodiaResguardoSheet
            folioResumen={resguardo.snapshot_folio}
            onClose={() => setCustodiaOpen(false)}
            onSuccess={onChanged}
            open={custodiaOpen}
            resguardoId={resguardo.id}
            session={session}
          />
          <EntregaResguardoSheet
            onClose={() => setEntregaOpen(false)}
            onSuccess={onChanged}
            open={entregaOpen}
            resguardo={resguardo}
            session={session}
          />
        </>
      )}
    </>
  )
}
