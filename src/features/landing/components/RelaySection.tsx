import { RELAY_STATIONS } from '../constants/modules';
import { Chapa } from './Chapa';
import { Quipu } from './Quipu';

const STATION_TONES = ['bone', 'mustard', 'bone', 'mustard'] as const;

export function RelaySection() {
  return (
    <section className="ck-section" aria-labelledby="relevo-title">
      <div className="ck-wrap">
        <Quipu />
        <div className="ck-split-head" style={{ marginTop: 'clamp(36px, 5vw, 64px)' }}>
          <h2 id="relevo-title" className="ck-h2 ck-display">
            Un pedido corre de estación en estación.
          </h2>
          <p>
            Antes, un chasqui llevaba los mensajes corriendo hasta que llegaban enteros. Tu
            pedido hace el mismo viaje: sale del celular de tu cliente y llega a tu local con
            todo anotado.
          </p>
        </div>
        <ol className="ck-relay-grid" style={{ listStyle: 'none', padding: 0 }}>
          {RELAY_STATIONS.map((station, i) => (
            <li key={station.name} className="ck-station">
              <Chapa tone={STATION_TONES[i]} chips={(i % 3) as 0 | 1 | 2}>
                <h3 className="ck-display">{station.name}</h3>
                <p>{station.text}</p>
              </Chapa>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
