import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronRight, LoaderCircle, Search, X } from 'lucide-react'
import type { MobileSession } from '../auth/auth.types'
import { mensajeErrorPdv } from '../puntoVenta/puntoVenta.errors'
import { ModalPortal } from '../../components/ui/ModalPortal'
import { listarEntregadosResguardo } from './resguardo.api'
import type { ResguardoEntregadoItem } from './resguardo.types'

interface Props {
  session: MobileSession
  onClose: () => void
  onOpen: (id: number) => void
}

function fecha(value?: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

export function HistorialEntregadosSheet({ session, onClose, onOpen }: Props) {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ResguardoEntregadoItem[]>([])
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listarEntregadosResguardo(session, { q: applied, page })
      setItems(response.resguardos.data)
      setLastPage(response.resguardos.last_page)
    } catch (err) {
      setError(mensajeErrorPdv(err, 'No se pudo cargar el historial de entregas.'))
    } finally {
      setLoading(false)
    }
  }, [applied, page, session])

  useEffect(() => {
    void load()
  }, [load])

  const search = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setApplied(query.trim())
  }

  return (
    <ModalPortal>
      <div className="pdv-overlay" role="presentation">
        <section aria-modal="true" className="pdv-sheet pdv-sheet--detail" role="dialog">
          <header className="pdv-sheet__header">
            <div>
              <span className="pdv-kicker">Consulta</span>
              <h2>Entregas realizadas</h2>
            </div>
            <button aria-label="Cerrar" className="pdv-icon-button" onClick={onClose} type="button">
              <X size={19} />
            </button>
          </header>

          <form className="pdv-search" onSubmit={search}>
            <Search size={17} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Folio o cliente"
              value={query}
            />
            <button className="secondary-button" type="submit">Buscar</button>
          </form>

          {error && <p className="form-error" role="alert">{error}</p>}
          {loading ? (
            <div className="pdv-loading-block"><LoaderCircle className="spin" /> Cargando entregas…</div>
          ) : items.length === 0 ? (
            <p className="pdv-muted">No hay entregas con ese criterio.</p>
          ) : (
            <div className="pdv-card-list">
              {items.map((item) => (
                <button className="pdv-resguardo-card" key={item.id} onClick={() => onOpen(item.id)} type="button">
                  <strong>{item.snapshot_folio || `Resguardo #${item.id}`}</strong>
                  <span>{item.snapshot_cliente_nombre || item.referencia_cliente || 'Cliente sin nombre'}</span>
                  <span>{item.ultima_entrega?.nombre_quien_retira || 'Sin receptor'} · {fecha(item.entrega_completada_at)}</span>
                  <ChevronRight className="pdv-resguardo-card__arrow" />
                </button>
              ))}
            </div>
          )}

          {lastPage > 1 && (
            <div className="pdv-pagination">
              <button className="secondary-button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} type="button">
                Anterior
              </button>
              <span>{page} / {lastPage}</span>
              <button className="secondary-button" disabled={page >= lastPage || loading} onClick={() => setPage((current) => current + 1)} type="button">
                Siguiente
              </button>
            </div>
          )}
        </section>
      </div>
    </ModalPortal>
  )
}
