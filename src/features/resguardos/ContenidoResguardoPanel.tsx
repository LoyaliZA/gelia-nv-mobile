import type { ResguardoDetalle, ResguardoTimelineItem } from './resguardo.types'
import { ImagenResguardo } from './ImagenResguardo'
import {
  contenidoResguardo,
  evidenciasEntrega,
  hayContenidoVisual,
} from './contenidoResguardo'
import type { FotoResguardo } from './contenidoResguardo'

interface Props {
  resguardo: ResguardoDetalle
  timeline?: ResguardoTimelineItem[]
  token: string
  mostrarEntrega?: boolean
}

function Galeria({ fotos, token }: { fotos: FotoResguardo[]; token: string }) {
  if (fotos.length === 0) return null
  return (
    <div className="pdv-evidence-grid">
      {fotos.map((foto) => (
        <figure className="pdv-evidence-card" key={foto.key}>
          <span>{foto.etiqueta}</span>
          <ImagenResguardo alt={foto.etiqueta} path={foto.path} token={token} />
        </figure>
      ))}
    </div>
  )
}

export function ContenidoResguardoPanel({
  resguardo,
  timeline = [],
  token,
  mostrarEntrega = false,
}: Props) {
  const contenido = contenidoResguardo(resguardo)
  const entrega = evidenciasEntrega(resguardo.id, timeline)
  const visible = hayContenidoVisual(contenido)
  const entregaVisible = mostrarEntrega && (entrega.fotos.length > 0 || entrega.firmas.length > 0)

  if (!visible && !entregaVisible) return null

  return (
    <section className="pdv-detail-section">
      {visible && (
        <>
          <h4>Contenido a entregar</h4>
          <Galeria
            fotos={[
              ...contenido.paquetes,
              ...contenido.tickets,
              ...contenido.piezas.flatMap((pieza) => pieza.fotos.map((foto) => ({
                ...foto,
                etiqueta: pieza.titulo,
              }))),
            ]}
            token={token}
          />
          {contenido.piezas.length > 0 && (
            <div className="pdv-evidence-block">
              <p>Piezas</p>
              <ul className="pdv-piezas pdv-piezas--vista">
                {contenido.piezas.map((pieza) => (
                  <li key={pieza.key}>
                    <div>
                      <strong>{pieza.titulo}</strong>
                      {pieza.detalle ? <small>{pieza.detalle}</small> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {entregaVisible && (
        <div className="pdv-evidence-block">
          <h4>Evidencia de entrega</h4>
          <Galeria fotos={[...entrega.fotos, ...entrega.firmas]} token={token} />
        </div>
      )}
    </section>
  )
}
