# RLS scoping: `store_id IS NULL` pasa el check ("puente permisivo")

`is_store_admin(check_store_id)` — la función SQL detrás de casi toda policy de escritura/lectura admin desde #15-#22 — devuelve `true` no solo cuando el usuario es admin de esa Store o `super_admin`, sino también cuando `check_store_id IS NULL`:

```sql
CREATE OR REPLACE FUNCTION public.is_store_admin(check_store_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.store_admins sa WHERE sa.profile_id = auth.uid() AND sa.store_id = check_store_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    OR check_store_id IS NULL;
$$;
```

Se evaluó exigir `store_id NOT NULL` desde el arranque del scoping por Store (#15) contra tolerar filas con `store_id IS NULL` durante la migración, dejando que cualquier admin autenticado pase el check sobre esas filas puntuales. Se optó por tolerar: `supabase_multitenant_schema_expand.sql` (#10) agregó `store_id` como nullable sin backfill obligatorio, así que exigir `NOT NULL` en las policies desde el día uno de cada ticket de scoping (#15-#21) hubiera bloqueado con `403` cualquier fila legacy no migrada todavía — rompiendo funcionalidad existente en producción en lugar de simplemente no aislarla aún. El costo es real y aceptado a propósito: mientras el puente está abierto, cualquier admin autenticado de cualquier Store puede leer/escribir filas con `store_id IS NULL`, sin importar de qué Store son "en espíritu".

El puente se cierra en el ticket de contract (#22): ahí `store_id` pasa a `NOT NULL` en las tablas de negocio (con backfill previo verificado) y esta rama del `OR` se elimina de `is_store_admin`. Hasta entonces, cualquier ticket de scoping nuevo debe asumir que el puente sigue abierto y no puede tratar `store_id IS NULL` como "no debería pasar".
