-- Foto del catálogo del schema `public` para el chequeo de drift (#166).
--
-- Devuelve una fila por objeto: (category, key, fingerprint). La huella
-- cambia si el objeto cambia. Se corre IGUAL en la base local (generada desde
-- los canónicos de supabase/schema/) y en producción; scripts/db-drift.mjs
-- compara las dos fotos. Solo lee el catálogo del sistema: no toca datos ni
-- crea nada. Para correrla a mano en el SQL Editor o con el MCP de Supabase:
-- `npm run db:drift -- --print-query`.
--
-- Qué se compara y qué se deja afuera, a propósito:
-- - function: cuerpo SIN comentarios ni espacios (los canónicos tienen más
--   comentarios que lo que se pegó históricamente en el SQL Editor), más
--   SECURITY DEFINER, volatilidad, search_path y EXECUTE por rol (anon,
--   authenticated, service_role y PUBLIC). La clave incluye los tipos de los
--   parámetros, así que un overload de más aparece como objeto nuevo.
-- - column / constraint / index / policy / trigger / rls / enum / view.
-- - Los NOT NULL como constraint (PostgreSQL 18+) no se miran: ya están en
--   la huella de la columna y así la foto no depende de la versión.
-- - Las funciones que instala una extensión no son nuestras.
-- - Privilegios de tablas y de secuencias, datos, storage y el schema `auth`
--   (salvo el trigger sobre auth.users) quedan fuera de esta versión.

SET search_path = public;

SELECT category, key, fingerprint
FROM (
  SELECT 'function' AS category,
         p.oid::regprocedure::text AS key,
         concat_ws('|',
           md5(regexp_replace(regexp_replace(pg_get_functiondef(p.oid), '--[^\n\r]*', '', 'g'), '\s', '', 'g')),
           CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END,
           p.provolatile::text,
           coalesce(array_to_string(p.proconfig, ','), '-'),
           'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text,
           'authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
           'service_role=' || has_function_privilege('service_role', p.oid, 'EXECUTE')::text,
           'public=' || coalesce((SELECT bool_or(a.grantee = 0) FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a), false)::text
         ) AS fingerprint
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')

  UNION ALL
  SELECT 'column',
         c.relname || '.' || a.attname,
         concat_ws('|',
           format_type(a.atttypid, a.atttypmod),
           CASE WHEN a.attnotnull THEN 'not null' ELSE 'null' END,
           regexp_replace(coalesce(pg_get_expr(d.adbin, d.adrelid), '-'), '\s+', ' ', 'g'),
           'identity=' || a.attidentity::text,
           'generated=' || a.attgenerated::text
         )
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v') AND a.attnum > 0 AND NOT a.attisdropped

  UNION ALL
  SELECT 'constraint',
         c.relname || '.' || con.conname,
         con.contype::text || '|' || replace(pg_get_constraintdef(con.oid), E'\n', ' ')
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND con.contype <> 'n'

  UNION ALL
  SELECT 'index', tablename || '.' || indexname, replace(indexdef, E'\n', ' ')
  FROM pg_indexes
  WHERE schemaname = 'public'

  UNION ALL
  SELECT 'policy',
         tablename || '.' || policyname,
         concat_ws('|',
           cmd,
           array_to_string(roles, ','),
           replace(coalesce(qual, '-'), E'\n', ' '),
           replace(coalesce(with_check, '-'), E'\n', ' ')
         )
  FROM pg_policies
  WHERE schemaname = 'public'

  UNION ALL
  SELECT 'trigger',
         CASE WHEN n.nspname = 'public' THEN '' ELSE n.nspname || '.' END || c.relname || '.' || t.tgname,
         replace(pg_get_triggerdef(t.oid), E'\n', ' ')
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal AND (n.nspname = 'public' OR (n.nspname = 'auth' AND c.relname = 'users'))

  UNION ALL
  SELECT 'rls',
         c.relname,
         CASE WHEN c.relrowsecurity THEN 'enabled' ELSE 'disabled' END || '|' || CASE WHEN c.relforcerowsecurity THEN 'forced' ELSE 'not forced' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')

  UNION ALL
  SELECT 'enum', t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY t.typname

  UNION ALL
  SELECT 'view', viewname, md5(regexp_replace(definition, '\s', '', 'g'))
  FROM pg_views
  WHERE schemaname = 'public'
) objects
ORDER BY category, key;
