import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../components/ui/Icon'
import { buscarClienteLocal, hayCatalogoLocal } from './cliente.storage'
import type { ClienteMovil } from './cliente.types'

export function ClienteBusquedaView() {
  const [numero, setNumero] = useState('')
  const [searched, setSearched] = useState(false)
  const [cliente, setCliente] = useState<ClienteMovil | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = numero.replace(/\D/g, '')
    if (!normalized) return
    setNumero(normalized)
    setCliente(buscarClienteLocal(normalized))
    setSearched(true)
  }

  const reset = () => { setNumero(''); setCliente(null); setSearched(false) }

  return (
    <div className="page-stack client-lookup">
      <header className="page-heading">
        <span className="eyebrow">ACCESO RÁPIDO_</span>
        <h1>Consulta de clientes</h1>
        <p>Ingresa el número proporcionado por el cliente para corroborar su información.</p>
      </header>

      <section className="lookup-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="numero-cliente">Número de cliente</label>
          <div className="lookup-input-row">
            <div className="lookup-input-wrap"><span>#</span>
              <input autoComplete="off" autoFocus id="numero-cliente" inputMode="numeric" onChange={(event) => { setNumero(event.target.value.replace(/\D/g, '')); setSearched(false) }} pattern="[0-9]*" placeholder="Ej. 10045" value={numero} />
            </div>
            <button aria-label="Buscar cliente" className="search-button" disabled={!numero} type="submit"><Icon name="search" /></button>
          </div>
        </form>
        <div className="lookup-hint"><Icon name="shield" /> Consulta limitada a los clientes autorizados para tu usuario.</div>
      </section>

      {cliente && (
        <section className="client-result client-result--success" aria-live="polite">
          <div className="result-status"><span /> Cliente {cliente.es_inactivo ? 'inactivo' : 'activo'}</div>
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

      {searched && !cliente && (
        <section className="empty-result" aria-live="polite">
          <div className="empty-icon"><Icon name="users" /></div>
          <h2>{hayCatalogoLocal() ? 'Cliente no encontrado' : 'Catálogo pendiente de sincronizar'}</h2>
          <p>{hayCatalogoLocal() ? `No existe un cliente autorizado con el número ${numero}.` : 'La vista está preparada para descargar los clientes autorizados desde GELIA.'}</p>
          <button className="secondary-button" onClick={reset}>Limpiar búsqueda</button>
        </section>
      )}
    </div>
  )
}
