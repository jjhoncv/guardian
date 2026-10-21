# 0029. Proyectos con base de datos (MySQL)

- **Fecha:** 2026-10-20
- **Estado:** aceptada

## Contexto

Hasta la Fase 5 el Guardián solo manejó proyectos con Google Sheets. Info Site (demo comercial de un sitio administrable) necesita MySQL, Docker en local y un admin con imágenes subidas, como los proyectos del dueño (ajk-ecommerce, info-site-next). Netlify no corre Docker ni guarda archivos subidos en el disco del servidor.

## Decisión

- **Local:** MySQL 8 en Docker (`docker-compose.yml`). **CI:** un MySQL 8 temporal como servicio de GitHub Actions, con datos inventados, que se borra al terminar.
- **Staging y producción:** el sitio sigue en Netlify; la base es un **MySQL gestionado**, una base por ambiente. Por defecto **TiDB Cloud Starter** (compatible con MySQL, plan gratis con varias bases); el proyecto puede elegir otro proveedor.
- **Migraciones versionadas** en `db/migraciones/NNN-*.sql`, aplicadas por el Guardián con una tabla de control: en el CI desde cero, en staging al fusionar y en producción al aprobar el release. Nada de SQL a mano en los ambientes.
- **Secretos:** la conexión de cada ambiente vive en los **Environments de GitHub** (staging / production) para las migraciones, y en las variables secretas de Netlify, por contexto, para la página. La página usa un usuario con permisos de datos; las migraciones, uno con permisos de esquema.
- **Archivos subidos** (imágenes del admin) en **Netlify Blobs**, no en `public/`.
- Los previews por PR usan la base de staging: una tabla nueva se ve en staging después del merge. Una base por PR (p. ej. Neon, Postgres) queda en el Parking lot.

## Por qué

Mantiene el stack que el dueño ya domina (MySQL, Docker y su patrón Model-Repository-Mapper) y el corazón del Guardián (preview por PR, staging = `main`, producción con aprobación). Un servidor propio con Docker (VPS) obligaría a mantener el servidor y a perder los previews.

## Consecuencias

- `guardian-ci.yml` y `guardian-deploy.yml` / `guardian-release.yml` reciben una opción de base de datos; los proyectos con Sheets no cambian.
- El dueño crea la cuenta del proveedor y una base por ambiente; el Guardián le dice qué cargar y dónde.
- **Migraciones compatibles hacia atrás** (agregar tablas o columnas; borrar o renombrar en dos pasos): el rollback automático del smoke test vuelve al sitio anterior, pero no deshace la base, y los previews comparten la base de staging.
- En `guardian-deploy.yml` (staging, al fusionar) y `guardian-release.yml` (producción, después de la aprobación del Environment) las migraciones corren **antes** de publicar, con los secretos `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` y `MYSQL_DATABASE` del Environment (`staging` o `production`) y `MYSQL_SSL` (por defecto `1`). Si fallan, no se publica.
