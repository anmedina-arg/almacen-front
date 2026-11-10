import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { collectCatalog } from '../../../scripts/db-drift/collect.mjs';
import { diffCatalogs } from '../../../scripts/db-drift/diff.mjs';

// #166: el recolector del chequeo de drift, contra la base local de Docker.
// Cada mutación corre dentro de una transacción que se revierte (el
// parámetro `prelude` solo existe para esto y solo se acepta contra una base
// local), así que no queda nada escrito: el último test lo comprueba.
//
// Se mira siempre el resultado de diffCatalogs(base, mutada): lo agregado en
// la mutada aparece como "solo_produccion" y lo quitado como "solo_local".
const url = process.env.TEST_DB_URL;
const psqlAvailable = spawnSync(process.env.PSQL_PATH ?? 'psql', ['--version'], { encoding: 'utf8' }).status === 0;
// Solo corre si hay psql Y la base local contesta: con Docker caído se saltea
// en vez de romper el archivo entero.
const canRun =
  Boolean(url) &&
  psqlAvailable &&
  spawnSync(process.env.PSQL_PATH ?? 'psql', [url as string, '-X', '-q', '-A', '-t', '-c', 'select 1'], { encoding: 'utf8' }).status === 0;
const script = resolve('scripts/db-drift.mjs');

// La definición vigente de is_stock_tracked (supabase/schema/stock/is_stock_tracked.sql).
const STOCK_TRACKED_SAME_BODY = `
CREATE OR REPLACE FUNCTION public.is_stock_tracked(p_store_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  -- un comentario nuevo que no cambia nada
  SELECT   COALESCE((feature_flags->>'stock')::boolean, false)

  FROM public.stores   WHERE id = p_store_id;
$$;`;

describe('recolector del catálogo para el chequeo de drift (#166)', () => {
  const baseline = canRun ? collectCatalog({ url: url as string }) : new Map();

  function drift(prelude: string) {
    return diffCatalogs(baseline, collectCatalog({ url: url as string, prelude }));
  }

  it.skipIf(!canRun)('la foto cubre todas las categorías y es la misma si se saca dos veces', () => {
    const categories = new Set([...baseline.values()].map((row) => row.category));

    expect([...categories]).toEqual(expect.arrayContaining(['column', 'constraint', 'enum', 'function', 'index', 'policy', 'rls', 'trigger']));
    expect(diffCatalogs(baseline, collectCatalog({ url: url as string }))).toEqual([]);
  });

  it.skipIf(!canRun)('cambiar el cuerpo de una función es un drift', () => {
    const diffs = drift(`CREATE OR REPLACE FUNCTION public.is_stock_tracked(p_store_id INTEGER) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT true $$;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['distinto function is_stock_tracked(integer)']);
  });

  it.skipIf(!canRun)('un comentario o un espacio de más en el cuerpo no es un drift', () => {
    expect(drift(STOCK_TRACKED_SAME_BODY)).toEqual([]);
  });

  it.skipIf(!canRun)('un overload de más es un drift', () => {
    const diffs = drift(`CREATE FUNCTION public.is_stock_tracked(a INTEGER, b INTEGER) RETURNS BOOLEAN LANGUAGE sql AS $$ SELECT true $$;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['solo_produccion function is_stock_tracked(integer,integer)']);
  });

  it.skipIf(!canRun)('quitar un privilegio EXECUTE es un drift', () => {
    const diffs = drift(`REVOKE EXECUTE ON FUNCTION public.is_stock_tracked(INTEGER) FROM authenticated;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['distinto function is_stock_tracked(integer)']);
  });

  it.skipIf(!canRun)('agregar una columna es un drift', () => {
    const diffs = drift(`ALTER TABLE public.products ADD COLUMN drift_probe INTEGER;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['solo_produccion column products.drift_probe']);
  });

  it.skipIf(!canRun)('cambiar el tipo de una columna es un drift', () => {
    const diffs = drift(`ALTER TABLE public.stock_movement_log DROP CONSTRAINT chk_movement_type; ALTER TABLE public.stock_movement_log ALTER COLUMN notes TYPE VARCHAR(10);`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toContain('distinto column stock_movement_log.notes');
  });

  it.skipIf(!canRun)('quitar un constraint es un drift', () => {
    const diffs = drift(`ALTER TABLE public.stock_movement_log DROP CONSTRAINT chk_movement_type;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['solo_local constraint stock_movement_log.chk_movement_type']);
  });

  it.skipIf(!canRun)('quitar una policy es un drift', () => {
    const diffs = drift(`DROP POLICY "Public can view combo_components" ON public.combo_components;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['solo_local policy combo_components.Public can view combo_components']);
  });

  it.skipIf(!canRun)('quitar un trigger es un drift', () => {
    const diffs = drift(`DROP TRIGGER trg_sync_combo_cost ON public.combo_components;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['solo_local trigger combo_components.trg_sync_combo_cost']);
  });

  it.skipIf(!canRun)('apagar RLS en una tabla es un drift', () => {
    const diffs = drift(`ALTER TABLE public.combo_components DISABLE ROW LEVEL SECURITY;`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['distinto rls combo_components']);
  });

  it.skipIf(!canRun)('un índice de más es un drift', () => {
    const diffs = drift(`CREATE INDEX drift_probe_idx ON public.products (name);`);

    expect(diffs.map((d) => `${d.kind} ${d.category} ${d.key}`)).toEqual(['solo_produccion index products.drift_probe_idx']);
  });

  it.skipIf(!canRun)('nada de lo anterior quedó escrito en la base', () => {
    expect(diffCatalogs(baseline, collectCatalog({ url: url as string }))).toEqual([]);
  });

  it.skipIf(!psqlAvailable)('se niega a escribir (prelude) contra una base que no es local', () => {
    expect(() => collectCatalog({ url: 'postgresql://u:p@db.example.com:5432/postgres', prelude: 'SELECT 1;' })).toThrow(/local/i);
  });

  it.skipIf(!psqlAvailable)('si no puede conectar, el error no deja ver la contraseña', () => {
    let message = '';
    try {
      collectCatalog({ url: 'postgresql://postgres:ClaveSecreta123@127.0.0.1:1/postgres' });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toBe('');
    expect(message).not.toContain('ClaveSecreta123');
  });
});

// El script en sí (scripts/db-drift.mjs), de punta a punta. La "producción"
// es una foto en un archivo —el camino que se usa con el MCP o el SQL
// Editor— o una segunda URL que apunta a la misma base local.
describe('npm run db:drift (#166)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'db-drift-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const toTsv = (catalog: ReturnType<typeof collectCatalog>) =>
    [...catalog.values()].map((r) => `${r.category}\t${r.key}\t${r.fingerprint}`).join('\n') + '\n';

  function snapshotFile(name: string, edit?: (rows: string[]) => string[]) {
    const lines = toTsv(collectCatalog({ url: url as string })).trimEnd().split('\n');
    const file = join(dir, name);
    writeFileSync(file, (edit ? edit(lines) : lines).join('\n') + '\n');
    return file;
  }

  function expectedFile(name: string, entries: unknown[]) {
    const file = join(dir, name);
    writeFileSync(file, JSON.stringify(entries));
    return file;
  }

  function run(args: string[], env: Record<string, string> = {}) {
    const result = spawnSync(process.execPath, [script, '--local-url', url as string, '--expected', expectedFile('vacio.json', []), ...args], {
      encoding: 'utf8',
      env: { ...process.env, DRIFT_PROD_DB_URL: '', ...env },
    });
    return { status: result.status, out: `${result.stdout}${result.stderr}` };
  }

  it.skipIf(!canRun)('imprime la consulta para correrla a mano en producción', () => {
    const r = run(['--print-query']);

    expect(r.status).toBe(0);
    expect(r.out).toContain('SELECT category, key, fingerprint');
  });

  it.skipIf(!canRun)('sale con 0 cuando producción (una foto) es igual a local', () => {
    const r = run(['--prod-snapshot', snapshotFile('igual.tsv')]);

    expect(r.status).toBe(0);
    expect(r.out).toMatch(/sin diferencias inesperadas/i);
  });

  it.skipIf(!canRun)('sale con 1 y dice qué objeto difiere y en qué', () => {
    const file = snapshotFile('distinta.tsv', (rows) => [
      ...rows
        .filter((row) => !row.startsWith('index\tproducts.'))
        .map((row) => (row.startsWith('function\tis_stock_tracked(integer)') ? `${row}|cambiado` : row)),
      'column\tproducts.columna_solo_en_produccion\tinteger|null',
    ]);

    const r = run(['--prod-snapshot', file]);

    expect(r.status).toBe(1);
    expect(r.out).toContain('function is_stock_tracked(integer): distinto');
    expect(r.out).toContain('column products.columna_solo_en_produccion: solo en producción');
    expect(r.out).toMatch(/index products\..*: solo en local/);
  });

  it.skipIf(!canRun)('una diferencia declarada como esperada no hace fallar y se informa con su motivo', () => {
    const file = snapshotFile('esperada.tsv', (rows) => [...rows, 'column\tinventory.id\tinteger|not null']);
    const expected = expectedFile('esperadas.json', [{ keyPrefix: 'inventory.', kind: 'solo_produccion', reason: 'tabla legacy de prueba' }]);

    const r = run(['--prod-snapshot', file, '--expected', expected]);

    expect(r.status).toBe(0);
    expect(r.out).toContain('tabla legacy de prueba');
  });

  it.skipIf(!canRun)('avisa de una entrada esperada que ya no coincide con nada, sin fallar', () => {
    const expected = expectedFile('stale.json', [{ key: 'ya.no.existe', reason: 'se arregló' }]);

    const r = run(['--prod-snapshot', snapshotFile('stale.tsv'), '--expected', expected]);

    expect(r.status).toBe(0);
    expect(r.out).toMatch(/ya no coincide/i);
  });

  it.skipIf(!canRun)('con --json imprime las diferencias inesperadas como datos', () => {
    const file = snapshotFile('json.tsv', (rows) => [...rows, 'column\tproducts.extra\tinteger|null']);

    const r = run(['--prod-snapshot', file, '--json']);

    expect(r.status).toBe(1);
    expect(JSON.parse(r.out).unexpected).toEqual([{ category: 'column', key: 'products.extra', kind: 'solo_produccion', local: null, production: 'integer|null' }]);
  });

  it.skipIf(!canRun)('lee producción por conexión directa y nunca imprime la cadena de conexión ni la contraseña', () => {
    // Una segunda base, vacía, en el mismo servidor local: es la "producción".
    const empty = `drift_probe_${Date.now()}`;
    const admin = (sql: string) => spawnSync(process.env.PSQL_PATH ?? 'psql', [url as string, '-X', '-q', '-c', sql], { encoding: 'utf8' });
    expect(admin(`CREATE DATABASE ${empty}`).status).toBe(0);
    try {
      const second = (url as string).replace(/\/[^/]+$/, `/${empty}`);

      const r = run(['--prod-url', second]);

      // Vacía: todo lo de local aparece como "solo en local". Lo que importa
      // acá es que leyó la otra base y que no mostró credenciales.
      expect(r.status).toBe(1);
      expect(r.out).toMatch(/solo en local/);
      expect(r.out).not.toContain(second);
      expect(r.out).not.toMatch(/postgres:postgres@/);
    } finally {
      admin(`DROP DATABASE IF EXISTS ${empty}`);
    }
  });

  it.skipIf(!canRun)('se niega a comparar una base consigo misma, aunque se nombre distinto el host', () => {
    expect(run(['--prod-url', url as string]).status).toBe(2);

    const r = run(['--prod-url', (url as string).replace('127.0.0.1', 'localhost')]);

    expect(r.status).toBe(2);
    expect(r.out).toMatch(/misma base/i);
  });

  it.skipIf(!canRun)('acepta la forma --opción=valor y, en un error, no imprime el valor', () => {
    const r = run(['--opcion-desconocida=postgresql://u:ClaveSecreta123@host/db']);

    expect(r.status).toBe(2);
    expect(r.out).not.toContain('ClaveSecreta123');
  });

  it.skipIf(!canRun)('el flag --prod-snapshot gana sobre DRIFT_PROD_DB_URL del entorno', () => {
    const r = run(['--prod-snapshot', snapshotFile('gana.tsv')], { DRIFT_PROD_DB_URL: 'postgresql://u:p@db.example.com:5432/postgres' });

    expect(r.status).toBe(0);
    expect(r.out).toMatch(/archivo/);
  });

  it.skipIf(!canRun)('se niega si la base "local" no es local', () => {
    const result = spawnSync(
      process.execPath,
      [script, '--local-url', 'postgresql://u:p@db.example.com:5432/postgres', '--prod-snapshot', snapshotFile('x.tsv')],
      { encoding: 'utf8', env: { ...process.env, DRIFT_PROD_DB_URL: '' } }
    );

    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toMatch(/no es local/i);
  });

  it.skipIf(!canRun)('sin producción indicada explica cómo darla', () => {
    const r = run([]);

    expect(r.status).toBe(2);
    expect(r.out).toContain('DRIFT_PROD_DB_URL');
    expect(r.out).toContain('--prod-snapshot');
  });
});
