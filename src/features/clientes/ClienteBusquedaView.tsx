import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { ClienteSyncStatus } from './ClienteSyncStatus'
import type { ClienteSearchMeta } from './ClienteSyncContext'
import type { ClienteMovil } from './cliente.types'
import { useClienteSync } from './useClienteSync'

const MIN_NAME_LENGTH = 2

function isNumberLookup(term: string) {
  return /^\d+$/.test(term)
}

export function ClienteBusquedaView() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'number' | 'name' | null>(null)
  const [results, setResults] = useState<ClienteMovil[]>([])
  const [meta, setMeta] = useState<ClienteSearchMeta | null>(null)
  const [searched, setSearched] = useState(false)
  const [cliente, setCliente] = useState<ClienteMovil | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [source, setSource] = useState<'api' | 'local' | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { findCliente, searchClientes, online, state } = useClienteSync()

  const reset = () => {
    setQuery('')
    setMode(null)
    setResults([])
    setMeta(null)
    setCliente(null)
    setSearched(false)
    setSource(null)
    setValidationError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setValidationError(null)
    setCliente(null)
    setResults([])
    setMeta(null)
    setLoading(true)

    try {
      if (isNumberLookup(trimmed)) {
        setMode('number')
        const result = await findCliente(trimmed)
        setCliente(result.cliente)
        setSource(result.source)
        setSearched(true)
        return
      }

      if (trimmed.length < MIN_NAME_LENGTH) {
        setValidationError(`Ingresa al menos ${MIN_NAME_LENGTH} caracteres para buscar por nombre.`)
        setSearched(false)
        return
      }

      setMode('name')
      const pageResult = await searchClientes(trimmed, 1)
      setResults(pageResult.data)
      setMeta(pageResult.meta)
      setSource(pageResult.source)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!meta || meta.current_page >= meta.last_page || loadingMore) return
    setLoadingMore(true)
    try {
      const pageResult = await searchClientes(query.trim(), meta.current_page + 1)
      setResults((current) => [...current, ...pageResult.data])
      setMeta(pageResult.meta)
      setSource(pageResult.source)
    } finally {
      setLoadingMore(false)
    }
  }

  const selectCliente = (selected: ClienteMovil) => {
    setCliente(selected)
    setResults([])
    setMeta(null)
    setMode('number')
    setSearched(true)
  }

  const catalogReady = state.phase === 'ready' || state.downloaded > 0
  const canSubmit = query.trim().length > 0 && !loading
  const hasMoreResults = meta !== null && meta.current_page < meta.last_page

  return (
    <div className="page-stack client-lookup">
      <header className="page-heading page-heading--surface">
        <span className="eyebrow">OPERACIONES_</span>
        <h1>Consultar Clientes</h1>
        <p>Busca por número o nombre para corroborar la información del cliente autorizado.</p>
        <ClienteSyncStatus />
      </header>

      <section className="lookup-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="cliente-busqueda">Número o nombre de cliente</label>
          <div className="lookup-input-row">
            <div className="lookup-input-wrap lookup-input-wrap--search">
              <span><Icon name="search" /></span>
              <input
                autoComplete="off"
                autoFocus
                id="cliente-busqueda"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSearched(false)
                  setValidationError(null)
                }}
                placeholder="Ej. 10045 o Farmacia Central"
                value={query}
              />
            </div>
            <button aria-label="Buscar cliente" className="search-button" disabled={!canSubmit} type="submit">
              <Icon name={loading ? 'refresh' : 'search'} />
            </button>
          </div>
          {validationError && <p className="form-error lookup-form-error">{validationError}</p>}
        </form>
        <div className="lookup-hint"><Icon name="shield" /> Consulta limitada a los clientes autorizados para tu usuario.</div>
      </section>

      {mode === 'name' && results.length > 0 && !cliente && (
        <section className="cliente-results" aria-live="polite">
          <div className="cliente-results-header">
            <strong>{meta?.total ?? results.length} coincidencia{(meta?.total ?? results.length) === 1 ? '' : 's'}</strong>
            <span>Consulta desde {source === 'api' ? 'GELIA' : 'datos locales'}</span>
          </div>
          <ul className="cliente-results-list">
            {results.map((item) => (
              <li key={item.id}>
                <button className="cliente-result-item" onClick={() => selectCliente(item)} type="button">
                  <div className="cliente-result-item__main">
                    <span className="cliente-result-item__number">#{item.numero_cliente}</span>
                    <strong>{item.nombre}</strong>
                    {item.nombre_razon_social && <small>{item.nombre_razon_social}</small>}
                  </div>
                  <span className={`cliente-result-item__status${item.es_inactivo ? ' cliente-result-item__status--inactive' : ''}`}>
                    {item.es_inactivo ? 'Inactivo' : 'Activo'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {hasMoreResults && (
            <button className="secondary-button cliente-load-more" disabled={loadingMore} onClick={() => void loadMore()} type="button">
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          )}
        </section>
      )}

      {cliente && (
        <section className="client-result client-result--success" aria-live="polite">
          <div className="result-status"><span /> Cliente {cliente.es_inactivo ? 'inactivo' : 'activo'}</div>
          <div className="result-source">Consulta desde {source === 'api' ? 'GELIA' : 'datos locales'}</div>
          <div className="client-number">#{cliente.numero_cliente}</div>
          <h2>{cliente.nombre}</h2>
          {cliente.nombre_razon_social && <p>{cliente.nombre_razon_social}</p>}
          <dl>
            <div><dt>RFC</dt><dd>{cliente.rfc || 'No registrado'}</dd></div>
            <div><dt>Tipo</dt><dd>{cliente.tipo_cliente || 'Sin clasificación'}</dd></div>
            <div><dt>Lista</dt><dd>{cliente.lista_descuento || 'Público general'}</dd></div>
            <div><dt>Vendedor</dt><dd>{cliente.vendedor || 'No asignado'}</dd></div>
          </dl>
          <button className="secondary-button" onClick={reset}>Consultar otro cliente</button>
        </section>
      )}

      {searched && !cliente && mode === 'number' && (
        <section className="empty-result" aria-live="polite">
          <div className="empty-icon"><Icon name="users" /></div>
          <h2>Cliente no encontrado</h2>
          <p>{`No existe un cliente autorizado con el número ${query.trim()}.`}</p>
          <button className="secondary-button" onClick={reset}>Limpiar búsqueda</button>
        </section>
      )}

      {searched && !cliente && mode === 'name' && results.length === 0 && (
        <section className="empty-result" aria-live="polite">
          <div className="empty-icon"><Icon name="users" /></div>
          <h2>Sin coincidencias</h2>
          <p>
            {!online && !catalogReady
              ? 'Sin conexión y sin catálogo local disponible. Conéctate a internet para buscar en GELIA.'
              : `No hay clientes autorizados que coincidan con "${query.trim()}".`}
          </p>
          <button className="secondary-button" onClick={reset}>Limpiar búsqueda</button>
        </section>
      )}
    </div>
  )
}
