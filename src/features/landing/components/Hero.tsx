import Link from 'next/link';
import { Chapa } from './Chapa';
import { WhatsAppButton } from './WhatsAppButton';
import { LANDING_MODULES } from '../constants/modules';

// Pedido de ejemplo: datos de demostracion, no un pedido real.
function OrderTicket() {
  return (
    <div className="ck-ticket-wrap ck-hang" style={{ ['--i' as string]: 2 }}>
    <div className="ck-ticket">
      <span className="ck-ticket-tag">Ejemplo de pedido</span>
      <p>
        <strong>Hola! Quiero hacer un pedido:</strong>
      </p>
      <ul>
        <li>
          <b>1 kg</b> Asado de tira
        </li>
        <li>
          <b>500 g</b> Queso cremoso
        </li>
        <li>
          <b>2 u.</b> Gaseosa 2,25 L
        </li>
      </ul>
      <p>Barrio AC1, manzana 12, lote 4.</p>
    </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="ck-wrap ck-hero-wall" aria-labelledby="hero-title">
      <h1 id="hero-title" className="ck-hero-title ck-display">
        Del pedido de WhatsApp a la caja cerrada.
      </h1>
      <div className="ck-hero-row">
        <Chapa tone="bone" chips={0} className="ck-hero-base ck-hang" style={{ ['--i' as string]: 0 }}>
          <p className="ck-lede">
            El catálogo que le arma el pedido a tus vecinos es solo el comienzo. chaskyapp
            también lleva tu stock, tus precios, tus clientes y tus cuentas.
          </p>
          <div className="ck-hero-actions">
            <WhatsAppButton tone="red" />
            <Link href="/stores" className="ck-link">
              Ver quiénes ya lo usan
            </Link>
          </div>
          <p className="ck-base-band">
            <strong>Plan base</strong> Catálogo online y pedidos por WhatsApp.
          </p>
        </Chapa>
        <OrderTicket />
      </div>
      <div className="ck-questions">
        <div className="ck-question">
          <p className="ck-question-q ck-display">¿Cuáles son los productos que más se venden?</p>
        </div>
        <div className="ck-question">
          <p className="ck-question-q ck-display">¿Qué productos NO pueden faltar en tu negocio?</p>
        </div>
        <div className="ck-question">
          <p className="ck-question-q ck-display">¿Cuánto te queda de cada cosa para reponer?</p>
        </div>
        <div className="ck-question">
          <p className="ck-question-q ck-display">¿Quién te debe plata y cuánto?</p>
        </div>
      </div>
      <div className="ck-modules-intro">
        <div>
          <p className="ck-modules-title ck-display">
            ¿Te cuesta llevar esos números? Tenemos módulos para{' '}
            <mark>ordenar y hacer crecer tu comercio.</mark>
          </p>
          <p className="ck-modules-text">
            Se suman al plan base uno por uno, según lo que necesite tu local.
          </p>
        </div>
        <ul className="ck-modules-list" aria-label="Módulos de gestión">
          {LANDING_MODULES.map((m) => (
            <li key={m.code}>
              <a href="#modulos">{m.name}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
