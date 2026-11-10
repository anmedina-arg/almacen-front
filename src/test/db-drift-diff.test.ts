import { describe, expect, it } from 'vitest';
import { applyExpected, describeDiff, diffCatalogs, parseCatalog } from '../../scripts/db-drift/diff.mjs';
import { isLocalUrl, sameDatabase } from '../../scripts/db-drift/collect.mjs';

// #166: chequeo de drift entre producción y los archivos canónicos de
// supabase/schema/. Acá solo la parte pura: leer una foto del catálogo,
// compararla y separar lo esperado de lo inesperado. El recolector que la
// arma contra una base real se prueba en src/test/integration/db-drift.test.ts.
const row = (category: string, key: string, fingerprint: string) => `${category}\t${key}\t${fingerprint}`;

describe('parseCatalog', () => {
  it('lee filas separadas por tabulaciones e ignora líneas vacías', () => {
    const catalog = parseCatalog([row('function', 'a(integer)', 'h1'), '', row('column', 'orders.id', 'bigint')].join('\n') + '\n');

    expect(catalog.size).toBe(2);
    expect(catalog.get('function\ta(integer)')?.fingerprint).toBe('h1');
  });

  it('lee la misma foto como arreglo JSON (lo que devuelve el MCP o el SQL Editor)', () => {
    const catalog = parseCatalog(JSON.stringify([{ category: 'column', key: 'orders.id', fingerprint: 'bigint' }]));

    expect(catalog.get('column\torders.id')?.fingerprint).toBe('bigint');
  });

  it('rechaza una línea que no tiene tres campos', () => {
    expect(() => parseCatalog('function\tsolo-dos-campos')).toThrow(/línea 1/i);
  });

  it('rechaza un objeto repetido: dos filas con la misma categoría y clave', () => {
    expect(() => parseCatalog([row('function', 'a()', 'h1'), row('function', 'a()', 'h2')].join('\n'))).toThrow(/repetid/i);
  });
});

describe('diffCatalogs', () => {
  const local = parseCatalog([row('function', 'a()', 'h1'), row('column', 'orders.id', 'bigint'), row('index', 'orders.i1', 'ix')].join('\n'));

  it('no informa nada cuando las dos fotos son iguales', () => {
    expect(diffCatalogs(local, parseCatalog([row('function', 'a()', 'h1'), row('column', 'orders.id', 'bigint'), row('index', 'orders.i1', 'ix')].join('\n')))).toEqual([]);
  });

  it('distingue lo que está solo en local, solo en producción y lo que cambia', () => {
    const production = parseCatalog([row('function', 'a()', 'h-otro'), row('column', 'orders.id', 'bigint'), row('policy', 'orders.p1', 'x')].join('\n'));

    expect(diffCatalogs(local, production)).toEqual([
      { category: 'function', key: 'a()', kind: 'distinto', local: 'h1', production: 'h-otro' },
      { category: 'index', key: 'orders.i1', kind: 'solo_local', local: 'ix', production: null },
      { category: 'policy', key: 'orders.p1', kind: 'solo_produccion', local: null, production: 'x' },
    ]);
  });

  it('ordena por categoría y clave para que la salida sea estable', () => {
    const a = parseCatalog([row('z', 'k2', '1'), row('a', 'k9', '1'), row('z', 'k1', '1')].join('\n'));

    expect(diffCatalogs(a, parseCatalog('')).map((d) => `${d.category}/${d.key}`)).toEqual(['a/k9', 'z/k1', 'z/k2']);
  });
});

describe('applyExpected', () => {
  const diffs = diffCatalogs(
    parseCatalog([row('constraint', 'orders.orders_user_id_fkey', 'FK')].join('\n')),
    parseCatalog([row('column', 'inventory.id', 'integer'), row('index', 'inventory.inventory_pkey', 'pk'), row('function', 'x()', 'h')].join('\n'))
  );

  it('separa lo esperado, con su motivo, de lo inesperado', () => {
    const result = applyExpected(diffs, [
      { category: 'constraint', key: 'orders.orders_user_id_fkey', reason: 'solo local' },
      { keyPrefix: 'inventory.', kind: 'solo_produccion', reason: 'tabla legacy' },
    ]);

    expect(result.unexpected.map((d) => d.key)).toEqual(['x()']);
    // Las diferencias salen ordenadas por categoría: column, constraint, index.
    expect(result.expected.map((d) => `${d.key} -> ${d.reason}`)).toEqual([
      'inventory.id -> tabla legacy',
      'orders.orders_user_id_fkey -> solo local',
      'inventory.inventory_pkey -> tabla legacy',
    ]);
    expect(result.stale).toEqual([]);
  });

  it('un esperado solo vale para el tipo de diferencia que declara', () => {
    const result = applyExpected(diffs, [{ keyPrefix: 'inventory.', kind: 'distinto', reason: 'no es este tipo' }]);

    expect(result.unexpected).toHaveLength(4);
  });

  it('avisa de las entradas esperadas que ya no coinciden con nada', () => {
    const result = applyExpected(diffs, [{ key: 'ya-no-existe', reason: 'se arregló' }]);

    expect(result.stale).toEqual([{ key: 'ya-no-existe', reason: 'se arregló' }]);
  });

  it('rechaza una entrada sin motivo o sin ningún criterio', () => {
    expect(() => applyExpected(diffs, [{ key: 'a' } as never])).toThrow(/motivo/i);
    expect(() => applyExpected(diffs, [{ reason: 'sin criterio' } as never])).toThrow(/criterio/i);
  });
});

describe('describeDiff: en qué difiere una función o una columna', () => {
  const base = 'h1|definer|v|search_path=public|anon=false|authenticated=true|service_role=true|public=false';
  const fn = (production: string) => describeDiff({ category: 'function', key: 'f(integer)', kind: 'distinto', local: base, production });

  it('nombra el cuerpo cuando solo cambió el cuerpo, sin mostrar las huellas', () => {
    const text = fn(base.replace('h1', 'h2'));

    expect(text).toMatch(/cuerpo/i);
    expect(text).not.toMatch(/h1|h2/);
    expect(text).not.toMatch(/EXECUTE/);
  });

  it('nombra el privilegio y el rol que cambiaron', () => {
    expect(fn(base.replace('anon=false', 'anon=true'))).toContain('EXECUTE anon: local false, producción true');
  });

  it('nombra el search_path y SECURITY DEFINER', () => {
    expect(fn(base.replace('search_path=public', '-'))).toContain('search_path: local search_path=public, producción -');
    expect(fn(base.replace('definer', 'invoker'))).toContain('SECURITY DEFINER: local definer, producción invoker');
  });

  it('lista todo lo que cambió si cambió más de una cosa', () => {
    const text = fn(base.replace('h1', 'h2').replace('public=false', 'public=true'));

    expect(text).toMatch(/cuerpo/i);
    expect(text).toContain('EXECUTE PUBLIC: local false, producción true');
  });

  it('en una columna nombra el tipo y el default', () => {
    const text = describeDiff({
      category: 'column',
      key: 'orders.total',
      kind: 'distinto',
      local: 'numeric(12,2)|not null|0|identity=|generated=',
      production: 'numeric(10,2)|not null|1|identity=|generated=',
    });

    expect(text).toContain('tipo: local numeric(12,2), producción numeric(10,2)');
    expect(text).toContain('default: local 0, producción 1');
  });
});

describe('isLocalUrl: la guardia que impide escribir o comparar contra algo que no es la base local', () => {
  it('acepta localhost, 127.0.0.1 y ::1', () => {
    expect(isLocalUrl('postgresql://postgres:postgres@127.0.0.1:54332/postgres')).toBe(true);
    expect(isLocalUrl('postgresql://postgres:postgres@localhost:54332/postgres')).toBe(true);
    expect(isLocalUrl('postgresql://postgres:postgres@[::1]:54332/postgres')).toBe(true);
  });

  it('rechaza cualquier otro host', () => {
    expect(isLocalUrl('postgresql://u:p@db.example.com:5432/postgres')).toBe(false);
    expect(isLocalUrl('postgresql://u:p@localhost.example.com:5432/postgres')).toBe(false);
  });

  it('rechaza una URL que redirige el host con parámetros que psql respeta', () => {
    expect(isLocalUrl('postgresql://u:p@127.0.0.1/postgres?host=db.example.com')).toBe(false);
    expect(isLocalUrl('postgresql://u:p@127.0.0.1/postgres?hostaddr=203.0.113.9')).toBe(false);
    expect(isLocalUrl('postgresql://u:p@127.0.0.1/postgres?service=produccion')).toBe(false);
  });

  it('rechaza algo que no es una URL', () => {
    expect(isLocalUrl('no es una url')).toBe(false);
  });
});

describe('sameDatabase', () => {
  it('reconoce la misma base aunque se nombre distinto el host local', () => {
    expect(sameDatabase('postgresql://postgres:x@127.0.0.1:54332/postgres', 'postgresql://postgres:x@localhost:54332/postgres')).toBe(true);
  });

  it('distingue otra base, otro puerto u otro host', () => {
    const a = 'postgresql://postgres:x@127.0.0.1:54332/postgres';
    expect(sameDatabase(a, 'postgresql://postgres:x@127.0.0.1:54332/otra')).toBe(false);
    expect(sameDatabase(a, 'postgresql://postgres:x@127.0.0.1:54333/postgres')).toBe(false);
    expect(sameDatabase(a, 'postgresql://postgres:x@db.example.com:54332/postgres')).toBe(false);
  });
});

describe('describeDiff', () => {
  it('dice qué objeto difiere y en qué', () => {
    expect(describeDiff({ category: 'function', key: 'a()', kind: 'solo_produccion', local: null, production: 'h' })).toMatch(/function.*a\(\).*solo en producción/i);
    expect(describeDiff({ category: 'column', key: 'o.id', kind: 'distinto', local: 'bigint', production: 'integer' })).toMatch(/o\.id.*bigint.*integer/i);
  });
});
