import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { useModosDispositivo } from '../dispositivo/useModosDispositivo'
import { ClienteSyncStatus } from './ClienteSyncStatus'
import type { ClienteSearchMeta } from './ClienteSyncContext'
import { normalizeNumeroCliente } from './cliente.numero'
import type { ClienteMovil } from './cliente.types'
import { useClienteSync } from './useClienteSync'

const MIN_NAME_LENGTH = 2
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'buscar'] as const

type LookupMode = 'number' | 'name'

function ocultarTeclado() {
  const active = document.activeElement
  if (active instanceof HTMLElement) active.blur()
}

export function ClienteBusquedaView() {
  const { modoSimple } = useModosDispositivo()
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
  const [apiError, setApiError] = useState<string | null>(null)
  const numberInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const resultHeadingRef = useRef<HTMLElement>(null)
  const { findCliente, searchClientes, online, state, canSyncClientes } = useClienteSync()
  const tecladoNumerico = modoSimple && lookupMode === 'number' && !searched

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

  const buscarNumero = async (raw: string) => {
    const numero = normalizeNumeroCliente(raw)
    if (!numero) return
    setValidationError(null)
    setApiError(null)
    setCliente(null)
    setResults([])
    setMeta(null)
    setLoading(true)
    try {
      setMode('number')
      const result = await findCliente(numero)
      setCliente(result.cliente)
      setSource(result.source)
      setApiError(result.error ?? null)
      setSearched(true)
    } finally {
      setLoading(false)
      ocultarTeclado()
    }
  }

  const buscarNombre = async (raw: string) => {
    const trimmed = raw.trim()
    setValidationError(null)
    setApiError(null)
    setCliente(null)
    setResults([])
    setMeta(null)
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
      setApiError(pageResult.error ?? null)
      setSearched(true)
    } finally {
      setLoading(false)
      ocultarTeclado()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (lookupMode === 'number') {
      await buscarNumero(numberQuery)
      return
    }
    await buscarNombre(nameQuery)
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
      ocultarTeclado()
    }
  }

  const selectCliente = (selected: ClienteMovil) => {
    setCliente(selected)
    setResults([])
    setMeta(null)
    setMode('number')
    setSearched(true)
    ocultarTeclado()
  }

  const pulsarTecla = (tecla: (typeof TECLAS)[number]) => {
    if (loading) return
    if (tecla === 'borrar') {
      setNumberQuery((current) => current.slice(0, -1))
      setSearched(false)
      return
    }
    if (tecla === 'buscar') {
      void buscarNumero(numberQuery)
      return
    }
    setNumberQuery((current) => `${current}${tecla}`.replace(/\D/g, '').slice(0, 12))
    setSearched(false)
    setValidationError(null)
  }

  useEffect(() => {
    if (!searched) return
    resultHeadingRef.current?.focus()
  }, [searched, cliente?.id, mode])

  const catalogReady = state.phase === 'ready' || state.downloaded > 0
  const canSubmit = lookupMode === 'number'
    ? numberQuery.length > 0 && !loading
    : nameQuery.trim().length > 0 && !loading
  const hasMoreResults = meta !== null && meta.current_page < meta.last_page
  const mostrarFicha = Boolean(cliente)
  const mostrarLista = mode === 'name' && results.length > 0 && !cliente

  return (
    <div className="page-stack client-lookup">
      <header className="page-heading page-heading--surface">
        <span className="eyebrow">OPERACIONES_</span>
        <h1>Consultar clientes</h1>
        <p>Busca por número o por nombre para corroborar la información del cliente autorizado.</p>
        {canSyncClientes ? <ClienteSyncStatus /> : null}
      </header>

      {apiError && (
        <p className="form-error lookup-form-error" role="alert">{apiError}</p>
      )}

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
        <form onSubmit={(event) => void handleSubmit(event)}>
          {lookupMode === 'number' ? (
            <label htmlFor="cliente-numero">Número de cliente</label>
          ) : (
            <label htmlFor="cliente-nombre">Nombre de cliente</label>
          )}
          <div className="lookup-input-row">
            <div className="lookup-input-wrap lookup-input-wrap--search">
              <span><Icon name="search" /></span>
              {lookupMode === 'number' ? (
                tecladoNumerico ? (
                  <output className="lookup-number-display" id="cliente-numero">{numberQuery || '—'}</output>
                ) : (
                  <input
                    autoComplete="off"
                    autoFocus={!modoSimple}
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
                    ref={numberInputRef}
                    value={numberQuery}
                  />
                )
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
                  ref={nameInputRef}
                  value={nameQuery}
                />
              )}
            </div>
            {!tecladoNumerico && (
              <button aria-label="Buscar cliente" className="search-button" disabled={!canSubmit} type="submit">
                <Icon name={loading ? 'refresh' : 'search'} />
              </button>
            )}
          </div>
          {validationError && <p className="form-error lookup-form-error">{validationError}</p>}
          {tecladoNumerico && (
            <div aria-label="Teclado numérico" className="numeric-keypad" role="group">
              {TECLAS.map((tecla) => (
                <button
                  className={`numeric-key${tecla === 'buscar' ? ' numeric-key--search' : ''}${tecla === 'borrar' ? ' numeric-key--action' : ''}`}
                  disabled={loading || (tecla === 'buscar' && numberQuery.length === 0)}
                  key={tecla}
                  onClick={() => pulsarTecla(tecla)}
                  type="button"
                >
                  {tecla === 'borrar' ? 'Borrar' : tecla === 'buscar' ? 'Buscar' : tecla}
                </button>
              ))}
            </div>
          )}
        </form>
        <div className="lookup-hint"><Icon name="shield" /> Consulta limitada a los clientes autorizados para tu usuario.</div>
      </section>

      {mostrarLista && (
        <section className="cliente-results" aria-live="polite" ref={resultHeadingRef} tabIndex={-1}>
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

      {mostrarFicha && cliente && (
        <section className="client-result client-result--success" aria-live="polite" ref={resultHeadingRef} tabIndex={-1}>
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
          <button className={`secondary-button${modoSimple ? ' simple-reset' : ''}`} onClick={reset} type="button">
            Consultar otro cliente
          </button>
        </section>
      )}

      {searched && !cliente && mode === 'number' && (
        <section className="empty-result" aria-live="polite" ref={resultHeadingRef} tabIndex={-1}>
          <div className="empty-icon"><Icon name="users" /></div>
          <h2>Cliente no encontrado</h2>
          <p>{`No existe un cliente autorizado con el número ${numberQuery}.`}</p>
          <button className={`secondary-button${modoSimple ? ' simple-reset' : ''}`} onClick={reset} type="button">
            {modoSimple ? 'Consultar otro cliente' : 'Limpiar búsqueda'}
          </button>
        </section>
      )}

      {searched && !cliente && mode === 'name' && results.length === 0 && (
        <section className="empty-result" aria-live="polite" ref={resultHeadingRef} tabIndex={-1}>
          <div className="empty-icon"><Icon name="users" /></div>
          <h2>Sin coincidencias</h2>
          <p>
            {!online && !catalogReady
              ? 'Sin conexión y sin catálogo local disponible. Conéctate a internet para buscar en GELIA.'
              : `No hay clientes autorizados que coincidan con "${nameQuery.trim()}".`}
          </p>
          <button className={`secondary-button${modoSimple ? ' simple-reset' : ''}`} onClick={reset} type="button">
            {modoSimple ? 'Consultar otro cliente' : 'Limpiar búsqueda'}
          </button>
        </section>
      )}
    </div>
  )
}
