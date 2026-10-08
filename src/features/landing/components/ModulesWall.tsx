import { LANDING_MODULES } from '../constants/modules';
import { ModuleChapa } from './ModuleChapa';

export function ModulesWall() {
  return (
    <section
      id="modulos"
      className="ck-wrap ck-section"
      aria-labelledby="modulos-title"
      style={{ paddingTop: 0 }}
    >
      <div className="ck-split-head">
        <h2 id="modulos-title" className="ck-h2 ck-display">
          Sumá solo lo que tu local necesita.
        </h2>
        <p>
          Cada chapa es un módulo del panel. Arrancás con el catálogo por WhatsApp y
          activás los demás cuando los precisás. Tocá una chapa para darla vuelta.
        </p>
      </div>
      <div className="ck-wall">
        {LANDING_MODULES.map((module, index) => (
          <ModuleChapa key={module.code} module={module} index={index} />
        ))}
      </div>
    </section>
  );
}
