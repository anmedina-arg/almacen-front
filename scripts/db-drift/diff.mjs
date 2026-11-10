// Parte pura del chequeo de drift (#166): leer una foto del catálogo de una
// base, compararla con otra y separar lo esperado de lo inesperado. No toca
// ninguna base ni el sistema de archivos — el recolector (collect.mjs) y el
// script (scripts/db-drift.mjs) la usan, y src/test/db-drift-diff.test.ts la
// prueba sola.
//
// Una "foto" es una lista de filas { category, key, fingerprint }: cada
// objeto del schema (función, columna, constraint, índice, policy, trigger…)
// con una huella que cambia si el objeto cambia. Ver catalog-query.sql.

export const KINDS = Object.freeze({
  ONLY_LOCAL: 'solo_local',
  ONLY_PRODUCTION: 'solo_produccion',
  DIFFERENT: 'distinto',
});

const SEP = '\t';
const idOf = (category, key) => `${category}${SEP}${key}`;

/**
 * @typedef {{ category: string, key: string, fingerprint: string }} CatalogRow
 * @typedef {{ category: string, key: string, kind: string, local: string | null, production: string | null }} Diff
 * @typedef {{ category?: string | string[], key?: string, keyPrefix?: string, kind?: string | string[], reason: string }} Expected
 */

/**
 * Lee una foto como texto: filas `categoría<TAB>clave<TAB>huella` (lo que
 * imprime psql) o un arreglo JSON de objetos (lo que devuelven el MCP de
 * Supabase y el SQL Editor al exportar).
 * @param {string} text
 * @returns {Map<string, CatalogRow>}
 */
export function parseCatalog(text) {
  const trimmed = text.trim();
  /** @type {CatalogRow[]} */
  let rows = [];

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    rows = parsed.map((r, i) => {
      if (typeof r?.category !== 'string' || typeof r?.key !== 'string' || typeof r?.fingerprint !== 'string') {
        throw new Error(`Foto JSON inválida: el elemento ${i + 1} no tiene category, key y fingerprint`);
      }
      return { category: r.category, key: r.key, fingerprint: r.fingerprint };
    });
  } else if (trimmed !== '') {
    rows = text
      .split(/\r?\n/)
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => line.trim() !== '')
      .map(({ line, n }) => {
        const parts = line.split(SEP);
        if (parts.length !== 3) {
          throw new Error(`Foto inválida en la línea ${n}: se esperaban 3 campos separados por tabulación y hay ${parts.length}`);
        }
        return { category: parts[0], key: parts[1], fingerprint: parts[2] };
      });
  }

  const catalog = new Map();
  for (const row of rows) {
    const id = idOf(row.category, row.key);
    if (catalog.has(id)) {
      throw new Error(`Objeto repetido en la foto: ${row.category} ${row.key}`);
    }
    catalog.set(id, row);
  }
  return catalog;
}

/**
 * @param {Map<string, CatalogRow>} local
 * @param {Map<string, CatalogRow>} production
 * @returns {Diff[]}
 */
export function diffCatalogs(local, production) {
  /** @type {Diff[]} */
  const diffs = [];
  const ids = new Set([...local.keys(), ...production.keys()]);

  for (const id of ids) {
    const l = local.get(id);
    const p = production.get(id);
    const { category, key } = /** @type {CatalogRow} */ (l ?? p);

    if (l && !p) {
      diffs.push({ category, key, kind: KINDS.ONLY_LOCAL, local: l.fingerprint, production: null });
    } else if (!l && p) {
      diffs.push({ category, key, kind: KINDS.ONLY_PRODUCTION, local: null, production: p.fingerprint });
    } else if (l && p && l.fingerprint !== p.fingerprint) {
      diffs.push({ category, key, kind: KINDS.DIFFERENT, local: l.fingerprint, production: p.fingerprint });
    }
  }

  return diffs.sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key));
}

const asList = (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

function matches(entry, diff) {
  const categories = asList(entry.category);
  const kinds = asList(entry.kind);
  if (categories && !categories.includes(diff.category)) return false;
  if (kinds && !kinds.includes(diff.kind)) return false;
  if (entry.key !== undefined && entry.key !== diff.key) return false;
  if (entry.keyPrefix !== undefined && !diff.key.startsWith(entry.keyPrefix)) return false;
  return true;
}

/**
 * Separa las diferencias que se esperan (con su motivo, declaradas en
 * supabase/drift-expected.json) de las que no. Una entrada esperada que ya
 * no coincide con nada es "stale": probablemente se arregló y hay que
 * sacarla de la lista para que no tape un drift futuro.
 * @param {Diff[]} diffs
 * @param {Expected[]} expectedEntries
 */
export function applyExpected(diffs, expectedEntries) {
  for (const entry of expectedEntries) {
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      throw new Error(`Entrada esperada sin motivo: ${JSON.stringify(entry)}`);
    }
    if (entry.category === undefined && entry.key === undefined && entry.keyPrefix === undefined && entry.kind === undefined) {
      throw new Error(`Entrada esperada sin ningún criterio: ${JSON.stringify(entry)}`);
    }
  }

  const used = new Set();
  /** @type {Array<Diff & { reason: string }>} */
  const expected = [];
  /** @type {Diff[]} */
  const unexpected = [];

  for (const diff of diffs) {
    const entry = expectedEntries.find((e) => matches(e, diff));
    if (entry) {
      used.add(entry);
      expected.push({ ...diff, reason: entry.reason });
    } else {
      unexpected.push(diff);
    }
  }

  return { expected, unexpected, stale: expectedEntries.filter((e) => !used.has(e)) };
}

// Las huellas de función y de columna son campos separados por `|` (ver
// catalog-query.sql). Con estos nombres se dice EN QUÉ difieren, en vez de
// mostrar dos cadenas opacas. El cuerpo de una función es un md5: se dice que
// cambió, no se muestra.
const FIELD_LABELS = {
  function: ['cuerpo', 'SECURITY DEFINER', 'volatilidad', 'search_path', 'EXECUTE anon', 'EXECUTE authenticated', 'EXECUTE service_role', 'EXECUTE PUBLIC'],
  column: ['tipo', 'nulabilidad', 'default', 'identity', 'generated'],
};

/**
 * Lista qué campos de la huella cambiaron entre local y producción.
 * @param {string} category
 * @param {string} local
 * @param {string} production
 * @returns {string[]}
 */
export function explainChange(category, local, production) {
  const labels = FIELD_LABELS[/** @type {keyof typeof FIELD_LABELS} */ (category)];
  if (!labels) return [`local: ${local} | producción: ${production}`];

  const l = local.split('|');
  const p = production.split('|');
  const strip = (value) => (value === undefined ? '(nada)' : value.replace(/^(anon|authenticated|service_role|public|identity|generated)=/, ''));
  const changes = [];

  for (let i = 0; i < Math.max(l.length, p.length); i++) {
    if (l[i] === p[i]) continue;
    const label = labels[i] ?? `campo ${i + 1}`;
    changes.push(label === 'cuerpo' ? 'cuerpo distinto' : `${label}: local ${strip(l[i])}, producción ${strip(p[i])}`);
  }
  return changes;
}

/** @param {Diff} d */
export function describeDiff(d) {
  const head = `${d.category} ${d.key}`;
  if (d.kind === KINDS.ONLY_LOCAL) return `${head}: solo en local`;
  if (d.kind === KINDS.ONLY_PRODUCTION) return `${head}: solo en producción`;
  return `${head}: distinto (${explainChange(d.category, d.local ?? '', d.production ?? '').join('; ')})`;
}
