'use client';

import { useState } from 'react';
import { Chapa } from './Chapa';
import type { LandingModule } from '../constants/modules';

function TurnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ModuleChapa({ module, index }: { module: LandingModule; index: number }) {
  const [open, setOpen] = useState(false);
  const chips = (index % 3) as 0 | 1 | 2;

  return (
    <article
      className="ck-flip ck-mod"
      data-open={open}
      style={{ ['--span' as string]: module.span }}
    >
      <div className="ck-flip-inner">
        <Chapa
          tone={module.tone}
          chips={chips}
          className="ck-face ck-face-front"
          ariaHidden={open}
        >
          <span className="ck-code ck-display" style={{ alignSelf: 'flex-start' }}>
            {module.code}
          </span>
          <h3 className="ck-mod-name ck-display">{module.name}</h3>
          <p>{module.summary}</p>
          <span className="ck-turn" aria-hidden="true">
            <TurnIcon /> Dar vuelta
          </span>
        </Chapa>

        <Chapa
          tone="navy"
          chips={((chips + 1) % 3) as 0 | 1 | 2}
          className="ck-face ck-face-back"
          ariaHidden={!open}
        >
          <span className="ck-code ck-display" style={{ alignSelf: 'flex-start' }}>
            {module.code} · {module.name}
          </span>
          <ul>
            {module.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {module.image && (
            <div className="ck-shot">
              {/* Captura real, la aporta el dueño del producto en /public/landing */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={module.image} alt={`Captura del módulo ${module.name} en Market Cevil`} />
            </div>
          )}
          <button
            type="button"
            className="ck-back-close"
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
          >
            Volver
          </button>
        </Chapa>
      </div>

      <button
        type="button"
        className="ck-flip-hit"
        aria-expanded={open}
        aria-label={`Dar vuelta la chapa ${module.code}, ${module.name}`}
        onClick={() => setOpen(true)}
      />
    </article>
  );
}
