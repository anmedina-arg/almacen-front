// Recolector del chequeo de drift (#166): corre catalog-query.sql contra una
// base con `psql` y devuelve la foto del catálogo. Sin dependencias nuevas
// (psql ya hace falta para el resto de los scripts de base de este repo).
//
// SOLO LECTURA: la consulta corre dentro de `BEGIN READ ONLY` y se descarta
// con ROLLBACK. El único camino que escribe es `prelude`, que existe para que
// los tests puedan mutar la base local dentro de una transacción que se
// revierte, y se niega contra cualquier base que no sea local.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseCatalog } from './diff.mjs';

const QUERY_PATH = fileURLToPath(new URL('./catalog-query.sql', import.meta.url));

export function readCatalogQuery() {
  return readFileSync(QUERY_PATH, 'utf8');
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

/**
 * ¿La URL apunta a la base local? Además del host, rechaza los parámetros de
 * la URI de libpq que le cambian el destino a psql (`?host=`, `?hostaddr=`,
 * `?service=`): con ellos `postgresql://u:p@127.0.0.1/db?host=otro.com` se ve
 * local pero psql se conecta a otro lado.
 * @param {string} url
 */
export function isLocalUrl(url) {
  try {
    const u = new URL(url);
    if (['host', 'hostaddr', 'service'].some((param) => u.searchParams.has(param))) return false;
    return LOCAL_HOSTS.includes(u.hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
}

/**
 * ¿Dos URLs apuntan a la misma base? `localhost`, `127.0.0.1` y `::1` cuentan
 * como el mismo host. Sirve para no comparar una base contra sí misma.
 * @param {string} a
 * @param {string} b
 */
export function sameDatabase(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const host = (u) => {
      const h = u.hostname.replace(/^\[|\]$/g, '');
      return LOCAL_HOSTS.includes(h) ? 'local' : h;
    };
    return host(ua) === host(ub) && (ua.port || '5432') === (ub.port || '5432') && ua.pathname === ub.pathname && ua.username === ub.username;
  } catch {
    return a === b;
  }
}

/**
 * El entorno de psql sin las variables que le cambian el destino a la
 * conexión: el host de la URL es el que manda, y la guardia de isLocalUrl
 * solo mira la URL.
 */
function cleanEnv() {
  const env = { ...process.env };
  for (const name of ['PGHOST', 'PGHOSTADDR', 'PGPORT', 'PGSERVICE', 'PGSERVICEFILE']) delete env[name];
  return env;
}

/** Saca de un mensaje la URL y la contraseña, para no imprimirlas nunca. */
function scrub(message, url) {
  let out = message.split(url).join('<url>');
  try {
    const { password } = new URL(url);
    if (password) out = out.split(decodeURIComponent(password)).join('***').split(password).join('***');
  } catch {
    // URL inválida: no hay contraseña que sacar.
  }
  return out;
}

/**
 * @param {{ url: string, prelude?: string }} options
 *   url: cadena de conexión de psql.
 *   prelude: SQL que se ejecuta antes de la foto, dentro de una transacción
 *     que se revierte. Solo para tests, solo contra una base local.
 * @returns {ReturnType<typeof parseCatalog>}
 */
export function collectCatalog({ url, prelude }) {
  if (prelude && !isLocalUrl(url)) {
    throw new Error('Se niega a ejecutar SQL de escritura (prelude) contra una base que no es local.');
  }

  const query = readCatalogQuery();
  const script = prelude ? `BEGIN;\n${prelude}\n${query}\nROLLBACK;\n` : `BEGIN READ ONLY;\n${query}\nROLLBACK;\n`;

  // La contraseña viaja por el entorno (PGPASSWORD) y no en los argumentos de
  // psql, que cualquiera puede ver en la lista de procesos.
  let connectionUrl = url;
  /** @type {Record<string, string>} */
  const secretEnv = {};
  try {
    const u = new URL(url);
    if (u.password) {
      secretEnv.PGPASSWORD = decodeURIComponent(u.password);
      u.password = '';
      connectionUrl = u.toString();
    }
  } catch {
    // URL que no se puede analizar: se la pasa tal cual y psql dirá qué falla.
  }

  const psql = process.env.PSQL_PATH ?? 'psql';
  const result = spawnSync(psql, [connectionUrl, '-X', '-q', '-A', '-t', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], {
    input: script,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...cleanEnv(), PGCONNECT_TIMEOUT: '15', ...secretEnv },
  });

  if (result.error) {
    const hint = /** @type {NodeJS.ErrnoException} */ (result.error).code === 'ENOENT' ? ' (¿está psql en el PATH? También se puede apuntar con PSQL_PATH)' : '';
    throw new Error(`No se pudo ejecutar psql${hint}: ${scrub(result.error.message, url)}`);
  }
  if (result.status !== 0) {
    throw new Error(`psql terminó con error: ${scrub((result.stderr || result.stdout || '').trim(), url)}`);
  }

  return parseCatalog(result.stdout);
}
