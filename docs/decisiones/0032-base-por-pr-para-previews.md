# 0032. Base propia por PR para los previews

- **Fecha:** 2026-10-23
- **Estado:** aceptada

## Contexto

Los previews usaban la base de staging. Cuando un PR crea una tabla, la tabla recién existe en staging al fusionar, así que el preview daba 500 (Info Site #61, banners). El dueño no podía probar el cambio antes de aprobarlo. Separar la base por contexto de Netlify no sirve: staging y los previews se publican igual (`netlify deploy --alias`) y Netlify los trata como el mismo contexto.

## Decisión

- Cada preview usa la base **`<repo>_pr_<N>`** (p. ej. `info_site_pr_61`) en el cluster de staging. El job `base_preview` de `guardian-deploy.yml` la borra, la crea vacía y le aplica las migraciones del PR (con la semilla de la demo) en cada deploy. Al cerrar el PR, `borrar_base_preview` la borra (#282).
- La conexión sale del **Environment `preview`** de GitHub (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`): un usuario **`PREFIJO.preview`** con `ALL` solo sobre `<repo>\_pr\_%`. No puede leer, cambiar ni borrar staging ni producción (probado en TiDB 8.5).
- La página usa su usuario de siempre (`PREFIJO.app`), con `SELECT, INSERT, UPDATE, DELETE` también sobre `<repo>\_pr\_%`.
- El build del preview recibe `MYSQL_DATABASE_PREVIEW=<repo>_pr_<N>` (no es secreto). El proyecto lo deja fijo en el build (`next.config` → `env`) y lo usa en vez de `MYSQL_DATABASE` cuando existe.
- Sin esos secretos en el Environment `preview`, todo sigue como antes (el preview usa staging) y el run lo avisa.

## Consecuencias

- Cada PR se prueba con sus tablas y su semilla, sin pisar a otros PRs ni a staging.
- El SQL del PR corre con un usuario que solo alcanza las bases `_pr_`: una migración rota rompe solo su preview.
- El llamador de deploy escucha también `pull_request: closed`.
