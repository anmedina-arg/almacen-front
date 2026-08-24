# RLS scoping: `store_id IS NULL` pasa el check ("puente permisivo")

**Estado: cerrado en #22 (2026-08-24).** El puente descrito en este ADR ya
no existe — `is_store_admin()` no tiene la rama `OR check_store_id IS NULL`
(ver `supabase/schema/products/is_store_admin.sql`), y las 13 tablas de
negocio tienen `store_id NOT NULL`. Este documento queda como registro
histórico de la decisión original y su cierre — no describe el
comportamiento vigente de `is_store_admin()`, solo por qué existió el
puente entre #15 y #22.

`is_store_admin(check_store_id)` — la función SQL detrás de casi toda policy de escritura/lectura admin desde #15-#22 — devolvía `true` no solo cuando el usuario era admin de esa Store o `super_admin`, sino también cuando `check_store_id IS NULL`. Definición que tuvo mientras el puente estuvo abierto (hoy en `supabase/supabase_store_scoping_products.sql`, en camino a `supabase/schema/products/` por #85 — como con cualquier objeto de schema, no asumir que este fragmento sigue vigente: verificar la definición viva antes de depender de ella, por la regla de `docs/agents/schema-changes.md`):

```sql
OR check_store_id IS NULL
```

es la rama del `OR` que implementa el puente; las otras dos ramas comprueban membresía en `store_admins` y `role = 'super_admin'`.

Se evaluó exigir `store_id NOT NULL` desde el arranque del scoping por Store (#15) contra tolerar filas con `store_id IS NULL` durante la migración, dejando que cualquier admin autenticado pase el check sobre esas filas puntuales. Se optó por tolerar: `supabase_multitenant_schema_expand.sql` (#10) agregó `store_id` como nullable sin backfill obligatorio, así que exigir `NOT NULL` en las policies desde el día uno de cada ticket de scoping (#15-#21) hubiera bloqueado con `403` cualquier fila legacy no migrada todavía — rompiendo funcionalidad existente en producción en lugar de simplemente no aislarla aún. El costo es real y aceptado a propósito: mientras el puente está abierto, cualquier admin autenticado de cualquier Store puede leer/escribir filas con `store_id IS NULL`, sin importar de qué Store son "en espíritu".

El puente se cerró en el ticket de contract (#22): `store_id` pasó a `NOT NULL` en las 13 tablas de negocio (con backfill previo verificado, incluyendo dos gaps encontrados durante la investigación de #22 mismo — #46 y #52, triggers que nunca seteaban `store_id` en tablas de auditoría) y esta rama del `OR` se eliminó de `is_store_admin`. Cualquier ticket nuevo que toque estas tablas puede asumir que `store_id` nunca es `NULL` — ya no hace falta el razonamiento de "todavía puede haber filas legacy" que aplicaba entre #15 y #22.
