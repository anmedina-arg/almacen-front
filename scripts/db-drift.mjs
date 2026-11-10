#!/usr/bin/env node
// Chequeo de drift (#166): compara la base de producción con los archivos
// canónicos de supabase/schema/ y lista lo que difiere.
//
// "Los canónicos" = la base local de Docker, que se genera desde ellos con
// `npm run db:reset`. Se saca la misma foto del catálogo (funciones, columnas,
// constraints, índices, policies, triggers, RLS, enums) de las dos bases y se
// comparan. Ver scripts/db-drift/catalog-query.sql para qué se mira.
//
// SOLO LECTURA sobre producción: la consulta corre en BEGIN READ ONLY y se
// descarta. La cadena de conexión nunca se imprime.
//
// Uso:
//   npm run db:reset                                  # la base local tiene que estar al día
//   DRIFT_PROD_DB_URL=postgresql://… npm run db:drift # conexión directa a producción
//   npm run db:drift -- --print-query                 # la consulta, para correrla a mano
//   npm run db:drift -- --prod-snapshot foto.json     # foto de producción sacada a mano
//
// Salida: 0 sin diferencias inesperadas, 1 con diferencias inesperadas, 2 si
// no pudo comparar (argumentos, conexión, archivos). Las diferencias que se
// esperan a propósito están en supabase/drift-expected.json, cada una con su
// motivo. Ver docs/agents/schema-changes.md y docs/ops/base-local-docker.md.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { collectCatalog, isLocalUrl, readCatalogQuery, sameDatabase } from './db-drift/collect.mjs';
import { applyExpected, describeDiff, diffCatalogs, parseCatalog } from './db-drift/diff.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_LOCAL_URL = 'postgresql://postgres:postgres@127.0.0.1:54332/postgres';
const DEFAULT_EXPECTED = join(root, 'supabase', 'drift-expected.json');

// Solo se leen las dos variables que hacen falta, cada una de su archivo
// (TEST_DB_URL de .env.test, DRIFT_PROD_DB_URL de .env.local): no se vuelca
// todo .env.local —con las claves de producción— al entorno. Lo que ya está
// en el entorno gana, aunque esté vacío.
function fromEnvFile(file, key) {
  try {
    return parseEnv(readFileSync(join(root, file), 'utf8'))[key];
  } catch {
    return undefined; // El archivo no existe: no pasa nada.
  }
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { json: false, printQuery: false, help: false };
  const valueFlags = { '--prod-url': 'prodUrl', '--prod-snapshot': 'prodSnapshot', '--local-url': 'localUrl', '--expected': 'expected' };

  for (let i = 0; i < argv.length; i++) {
    // Acepta `--opción valor` y `--opción=valor`. En un error nunca se
    // imprime lo que viene después del `=`: puede ser una cadena de conexión.
    const [flag, inlineValue] = argv[i].split(/=(.*)/s, 2);
    if (['--json', '--print-query', '--help', '-h'].includes(flag) && inlineValue !== undefined) {
      fail(`${flag} no lleva valor.`);
    }
    if (flag === '--json') args.json = true;
    else if (flag === '--print-query') args.printQuery = true;
    else if (flag === '--help' || flag === '-h') args.help = true;
    else if (flag in valueFlags) {
      const value = inlineValue ?? argv[++i];
      if (!value || value.startsWith('--')) fail(`Falta el valor de ${flag}.`);
      args[valueFlags[flag]] = value;
    } else {
      fail(`Opción desconocida: ${flag}. Probá con --help.`);
    }
  }
  return args;
}

const HELP = `Uso: npm run db:drift -- [opciones]

  --prod-url <url>         conexión directa a producción (o DRIFT_PROD_DB_URL)
  --prod-snapshot <file>   foto de producción sacada a mano (TSV o JSON)
  --local-url <url>        base local (por defecto TEST_DB_URL o la de Docker)
  --expected <file>        diferencias esperadas (por defecto supabase/drift-expected.json)
  --print-query            imprime la consulta para correrla a mano en producción
  --json                   salida como JSON
`;

const hostOf = (url) => {
  const u = new URL(url);
  return `${u.hostname}:${u.port || '5432'}`;
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(HELP);
  process.exit(0);
}
if (args.printQuery) {
  console.log(readCatalogQuery());
  process.exit(0);
}

const localUrl = args.localUrl || (process.env.TEST_DB_URL ?? fromEnvFile('.env.test', 'TEST_DB_URL')) || DEFAULT_LOCAL_URL;
if (!isLocalUrl(localUrl)) {
  fail('La base "local" no es local: tiene que apuntar a localhost, 127.0.0.1 o ::1 (la base de Docker). Si no, se compararía producción contra sí misma.');
}

// Lo que se pasa por flag gana: con --prod-snapshot se ignora DRIFT_PROD_DB_URL.
const prodUrl = args.prodUrl || (args.prodSnapshot ? '' : (process.env.DRIFT_PROD_DB_URL ?? fromEnvFile('.env.local', 'DRIFT_PROD_DB_URL')) || '');
if (!prodUrl && !args.prodSnapshot) {
  fail(`Falta indicar producción. Dos formas:
  - Conexión directa: definir DRIFT_PROD_DB_URL (o pasar --prod-url) con la cadena de conexión de Supabase.
  - A mano: correr \`npm run db:drift -- --print-query\` en producción (SQL Editor o MCP), guardar el resultado
    en un archivo y pasarlo con --prod-snapshot <archivo>.`);
}
if (prodUrl && args.prodSnapshot) fail('Indicá producción de una sola forma: --prod-url o --prod-snapshot, no las dos.');
if (prodUrl && sameDatabase(prodUrl, localUrl)) fail('La base de producción y la local son la misma base: no hay nada que comparar.');

let expectedEntries = [];
const expectedPath = args.expected ? resolve(args.expected) : DEFAULT_EXPECTED;
if (existsSync(expectedPath)) {
  try {
    expectedEntries = JSON.parse(readFileSync(expectedPath, 'utf8'));
  } catch (error) {
    fail(`No se pudo leer la lista de diferencias esperadas (${expectedPath}): ${error.message}`);
  }
} else if (args.expected) {
  fail(`No existe el archivo de diferencias esperadas: ${expectedPath}`);
}

let local;
let production;
let productionSource;
try {
  local = collectCatalog({ url: localUrl });
  if (prodUrl) {
    production = collectCatalog({ url: prodUrl });
    productionSource = hostOf(prodUrl);
  } else {
    production = parseCatalog(readFileSync(resolve(args.prodSnapshot), 'utf8'));
    productionSource = `archivo ${args.prodSnapshot}`;
  }
} catch (error) {
  fail(`No se pudo armar la comparación: ${error.message}`);
}

const diffs = diffCatalogs(local, production);
let result;
try {
  result = applyExpected(diffs, expectedEntries);
} catch (error) {
  fail(`La lista de diferencias esperadas es inválida: ${error.message}`);
}
const { expected, unexpected, stale } = result;

const countByCategory = (catalog) => {
  const counts = {};
  for (const { category } of catalog.values()) counts[category] = (counts[category] ?? 0) + 1;
  return counts;
};

if (args.json) {
  console.log(
    JSON.stringify(
      { local: { source: hostOf(localUrl), objects: local.size }, production: { source: productionSource, objects: production.size }, unexpected, expected, stale },
      null,
      2
    )
  );
  process.exit(unexpected.length > 0 ? 1 : 0);
}

const lines = [];
lines.push(`Chequeo de drift: local (${hostOf(localUrl)}) contra producción (${productionSource})`);
lines.push('');
const localCounts = countByCategory(local);
const prodCounts = countByCategory(production);
const categories = [...new Set([...Object.keys(localCounts), ...Object.keys(prodCounts)])].sort();
lines.push('Objetos por categoría (local / producción):');
for (const category of categories) lines.push(`  ${category.padEnd(11)} ${String(localCounts[category] ?? 0).padStart(4)} / ${String(prodCounts[category] ?? 0).padStart(4)}`);
lines.push('');

if (expected.length > 0) {
  const byReason = new Map();
  for (const d of expected) byReason.set(d.reason, (byReason.get(d.reason) ?? 0) + 1);
  lines.push(`Diferencias esperadas (${expected.length}):`);
  for (const [reason, n] of byReason) lines.push(`  - ${n} objeto(s): ${reason}`);
  lines.push('');
}

if (stale.length > 0) {
  lines.push(`AVISO: ${stale.length} entrada(s) de la lista de esperadas ya no coincide(n) con ninguna diferencia (¿se arregló? conviene sacarlas para que no tapen un drift futuro):`);
  for (const entry of stale) {
    const selector = [entry.category, entry.key ?? (entry.keyPrefix ? `${entry.keyPrefix}*` : undefined), entry.kind].filter(Boolean).join(' ');
    lines.push(`  - ${selector}`);
  }
  lines.push('');
}

if (unexpected.length > 0) {
  lines.push(`Diferencias INESPERADAS (${unexpected.length}):`);
  for (const d of unexpected) lines.push(`  - ${describeDiff(d)}`);
  lines.push('');
  lines.push('Si la diferencia es producción atrasada: aplicar el SQL del canónico (docs/agents/schema-changes.md).');
  lines.push('Si es un canónico atrasado: actualizarlo. Si es una diferencia a propósito: declararla con motivo en supabase/drift-expected.json.');
} else {
  lines.push('Sin diferencias inesperadas.');
}

console.log(lines.join('\n'));
process.exit(unexpected.length > 0 ? 1 : 0);
