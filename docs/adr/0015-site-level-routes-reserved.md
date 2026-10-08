---
status: accepted
---

# Rutas de nivel de sitio reservadas: `/`, `/stores` y `/admin`

[ADR-0003](0003-path-based-tenant-resolution.md) anidó todo bajo `[store]` y dejó la raíz `/` para la landing del producto, con la idea de que casi no harían falta slugs reservados. Con la landing de chaskyapp y el futuro panel de la plataforma aparecen más rutas que no pertenecen a ninguna Store, y sus nombres tienen que quedar fuera del alcance de los slugs.

## Decisión

Son rutas de nivel de sitio, y sus nombres están reservados como slug de Store:

- `/`: landing de marketing de chaskyapp.
- `/stores`: listado público de las Stores que usan la plataforma.
- `/admin`: panel del Platform admin (activar y desactivar feature flags por Store y ver métricas). **Reservada, todavía sin página**: hoy `/admin` da 404 hasta que se construya.
- Además de las que ya estaban: `api`, `robots.txt`, `sitemap.xml`.

La reserva vive en dos lugares que hay que mantener en sync:

- `SITE_LEVEL_ROUTES` en `src/middleware.ts`: estas rutas no se tratan como Store ni pasan por el control de sesión por Store.
- `RESERVED_SLUGS` en `src/features/store/services/provisionStore.ts`: dar de alta una Store con ese slug falla con "Slug reservado".

## Alternativas descartadas

- **Mover el admin de la plataforma bajo un prefijo** (ej. `/_platform/admin`): evita reservar nombres comunes, pero la URL que se comparte y recuerda es peor, y el panel de plataforma no se comparte con clientes. Se prefirió la URL corta y reservar el nombre.

## Consequences

- Ningún negocio puede llamarse `stores` ni `admin` en su URL. Si hay una Store existente con alguno de esos slugs, hay que renombrarla antes de desplegar la reserva (verificar en la tabla `stores`).
- El panel de plataforma debe autenticar al Platform admin (rol `super_admin`) sin pasar por el login por Store. Cómo entra esa persona queda **por decidir** al construir la página.
- Cada ruta nueva de nivel de sitio exige agregar su nombre a las dos listas de arriba.
