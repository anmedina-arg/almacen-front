#!/usr/bin/env node
// Genera las migraciones que la Supabase CLI aplica al levantar la base
// local en Docker (`supabase start` / `supabase db reset`), a partir de los
// archivos canónicos de supabase/schema/ en el orden que fija
// supabase/schema/apply-order.txt.
//
// supabase/migrations/ está gitignoreada a propósito: es un artefacto
// derivado. La fuente de verdad del repo siguen siendo los canónicos
// (ADR-0011) — no editar lo generado, editar el canónico y volver a correr.
//
// Uso: node scripts/build-local-schema.mjs
// Ver docs/ops/base-local-docker.md.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaDir = join(root, 'supabase', 'schema');
const localOnlyDir = join(root, 'supabase', 'local-only');
const migrationsDir = join(root, 'supabase', 'migrations');
const manifestPath = join(schemaDir, 'apply-order.txt');

function listSqlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSqlFiles(full));
    else if (entry.endsWith('.sql')) out.push(full);
  }
  return out.sort();
}

function toPosix(p) {
  return p.split('\\').join('/');
}

const manifest = readFileSync(manifestPath, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

// 1. Todo lo listado existe.
const missing = manifest.filter((rel) => !existsSync(join(schemaDir, rel)));
if (missing.length) {
  console.error('apply-order.txt lista archivos que no existen:\n  ' + missing.join('\n  '));
  process.exit(1);
}

// 2. Todo canónico está listado (y una sola vez).
const canonical = listSqlFiles(schemaDir).map((f) => toPosix(relative(schemaDir, f)));
const listed = new Set(manifest);
const unlisted = canonical.filter((f) => !listed.has(f));
if (unlisted.length) {
  console.error(
    'Archivos canónicos que faltan en supabase/schema/apply-order.txt:\n  ' +
      unlisted.join('\n  ') +
      '\nAgregalos en el lugar que corresponda por dependencias.'
  );
  process.exit(1);
}
const dupes = manifest.filter((f, i) => manifest.indexOf(f) !== i);
if (dupes.length) {
  console.error('apply-order.txt repite archivos:\n  ' + dupes.join('\n  '));
  process.exit(1);
}

function bundle(title, baseDir, files) {
  const parts = [
    `-- GENERADO por scripts/build-local-schema.mjs — NO EDITAR.`,
    `-- ${title}`,
    `-- Editá el archivo canónico correspondiente y volvé a correr el build.`,
    '',
  ];
  for (const rel of files) {
    const body = readFileSync(join(baseDir, rel), 'utf8').replace(/\r\n/g, '\n');
    parts.push(`-- >>> ${toPosix(relative(root, join(baseDir, rel)))}`);
    parts.push(body.trimEnd());
    parts.push('');
  }
  return parts.join('\n');
}

rmSync(migrationsDir, { recursive: true, force: true });
mkdirSync(migrationsDir, { recursive: true });

writeFileSync(
  join(migrationsDir, '00000000000001_canonical_schema.sql'),
  bundle('Schema canónico (supabase/schema/, orden de apply-order.txt).', schemaDir, manifest)
);

const localOnly = existsSync(localOnlyDir)
  ? listSqlFiles(localOnlyDir).map((f) => toPosix(relative(localOnlyDir, f)))
  : [];
if (localOnly.length) {
  writeFileSync(
    join(migrationsDir, '00000000000002_local_only.sql'),
    bundle('Ajustes SOLO para la base local (supabase/local-only/). Nunca en producción.', localOnlyDir, localOnly)
  );
}

console.log(
  `OK: ${manifest.length} archivos canónicos + ${localOnly.length} local-only → ${toPosix(relative(root, migrationsDir))}/`
);
