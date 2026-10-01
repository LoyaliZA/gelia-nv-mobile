import { Building2, RefreshCw } from 'lucide-react'
import { usePuntoVenta } from './usePuntoVenta'

export function SucursalActivaCard() {
  const {
    status,
    contexto,
    error,
    cambiandoSucursal,
    refresh,
    seleccionarSucursal,
  } = usePuntoVenta()

  if (status === 'loading' && !contexto) {
    return (
      <section className="pdv-sucursal-card pdv-sucursal-card--loading">
        <RefreshCw className="spin" size={18} />
        <span>Cargando sucursal operativa…</span>
      </section>
    )
  }

  if (status === 'error' && !contexto) {
    return (
      <section className="pdv-sucursal-card pdv-sucursal-card--warning">
        <div>
          <strong>No se pudo cargar Punto de Venta</strong>
          <span>{error}</span>
        </div>
        <button className="secondary-button" onClick={() => void refresh()} type="button">
          Reintentar
        </button>
      </section>
    )
  }

  if (!contexto) return null

  const activa = contexto.sucursal_activa
  const varias = contexto.sucursales_operables.length > 1

  return (
    <section className={`pdv-sucursal-card${activa ? '' : ' pdv-sucursal-card--warning'}`}>
      <div className="pdv-sucursal-card__icon">
        <Building2 size={18} />
      </div>
      <div className="pdv-sucursal-card__body">
        <span className="pdv-kicker">Sucursal activa</span>
        {varias ? (
          <select
            aria-label="Sucursal activa"
            disabled={cambiandoSucursal}
            onChange={(event) => {
              const id = Number(event.target.value)
              if (id > 0) void seleccionarSucursal(id)
            }}
            value={activa?.id ?? ''}
          >
            {!activa && <option value="">Selecciona una sucursal</option>}
            {contexto.sucursales_operables.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}{sucursal.es_principal ? ' · Principal' : ''}
              </option>
            ))}
          </select>
        ) : (
          <strong>{activa?.nombre ?? 'Sin sucursal activa'}</strong>
        )}
        {!activa && (
          <small>Debes seleccionar una sucursal antes de consultar resguardos o turnos.</small>
        )}
      </div>
      {cambiandoSucursal && <RefreshCw className="spin" size={17} />}
    </section>
  )
}
