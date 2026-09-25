import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { ClienteSyncStatus } from './ClienteSyncStatus'
import type { ClienteSearchMeta } from './ClienteSyncContext'
import { normalizeNumeroCliente } from './cliente.numero'
import type { ClienteMovil } from './cliente.types'
import { useClienteSync } from './useClienteSync'

const MIN_NAME_LENGTH = 2

type LookupMode = 'number' | 'name'

export function ClienteBusquedaView() {
  const [lookupMode, setLookupMode] = useState<LookupMode>('number')
  const [numberQuery, setNumberQuery] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [mode, setMode] = useState<LookupMode | null>(null)
  const [results, setResults] = useState<ClienteMovil[]>([])
  const [meta, setMeta] = useState<ClienteSearchMeta | null>(null)
  const [searched, setSearched] = useState(false)
  const [cliente, setCliente] = useState<ClienteMovil | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [source, setSource] = useState<'api' | 'local' | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { findCliente, searchClientes, online, state } = useClienteSync()

  const clearResults = () => {
    setMode(null)
    setResults([])
    setMeta(null)
    setCliente(null)
    setSearched(false)
    setSource(null)
    setValidationError(null)
  }

  const switchMode = (next: LookupMode) => {
    setLookupMode(next)
    clearResults()
  }

  const reset = () => {
    setNumberQuery('')
    setNameQuery('')
    clearResults()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)
    setCliente(null)
    setResults([])
    setMeta(null)

    if (lookupMode === 'number') {
      const numero = normalizeNumeroCliente(numberQuery)
      if (!numero) return
      setLoading(true)
      try {
        setMode('number')
        const result = await findCliente(numero)
        setCliente(result.cliente)
        setSource(result.source)
        setSearched(true)
      } finally {
        setLoading(false)
      }
      return
    }

    const trimmed = nameQuery.trim()
    if (!trimmed) return
    if (trimmed.length < MIN_NAME_LENGTH) {
      setValidationError(`Ingresa al menos ${MIN_NAME_LENGTH} caracteres para buscar por nombre.`)
      setSearched(false)
      return
    }

    setLoading(true)
    try {
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
      const pageResult = await searchClientes(nameQuery.trim(), meta.current_page + 1)
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
  const canSubmit = lookupMode === 'number'
    ? numberQuery.length > 0 && !loading
    : nameQuery.trim().length > 0 && !loading
  const hasMoreResults = meta !== null && meta.current_page < meta.last_page

  return (
    <div className="page-stack client-lookup">
      <header className="page-heading page-heading--surface">
        <span className="eyebrow">OPERACIONES_</span>
        <h1>Consultar Clientes</h1>
        <p>Busca por número o por nombre para corroborar la información del cliente autorizado.</p>
        <ClienteSyncStatus />
      </header>

      <section className="lookup-card">
        <div className="lookup-mode" role="tablist" aria-label="Tipo de búsqueda">
          <button
            aria-selected={lookupMode === 'number'}
            onClick={() => switchMode('number')}
            role="tab"
            type="button"
          >
            Por número
          </button>
          <button
            aria-selected={lookupMode === 'name'}
            onClick={() => switchMode('name')}
            role="tab"
            type="button"
          >
            Por nombre
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {lookupMode === 'number' ? (
            <label htmlFor="cliente-numero">Número de cliente</label>
          ) : (
            <label htmlFor="cliente-nombre">Nombre de cliente</label>
          )}
          <div className="lookup-input-row">
            <div className="lookup-input-wrap lookup-input-wrap--search">
              <span><Icon name="search" /></span>
              {lookupMode === 'number' ? (
                <input
                  autoComplete="off"
                  autoFocus
                  enterKeyHint="search"
                  id="cliente-numero"
                  inputMode="numeric"
                  onChange={(event) => {
                    setNumberQuery(event.target.value.replace(/\D/g, ''))
                    setSearched(false)
                    setValidationError(null)
                  }}
                  pattern="[0-9]*"
                  placeholder="Ej. 7 o 10045"
                  value={numberQuery}
                />
              ) : (
                <input
                  autoComplete="off"
                  autoFocus
                  enterKeyHint="search"
                  id="cliente-nombre"
                  inputMode="text"
                  onChange={(event) => {
                    setNameQuery(event.target.value)
                    setSearched(false)
                    setValidationError(null)
                  }}
                  placeholder="Ej. Farmacia Central"
                  value={nameQuery}
                />
              )}
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
          <p>{`No existe un cliente autorizado con el número ${numberQuery}.`}</p>
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
              : `No hay clientes autorizados que coincidan con "${nameQuery.trim()}".`}
          </p>
          <button className="secondary-button" onClick={reset}>Limpiar búsqueda</button>
        </section>
      )}
    </div>
  )
}
