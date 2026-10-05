# 0021. El Guardián es una plataforma; los proyectos nacen de `guardian-skeleton`

- **Fecha:** 2026-10-05
- **Estado:** Aceptada (reemplaza a 0010, 0014 y 0016)

## Contexto

Como plantilla de GitHub, el Guardián copiaba a cada proyecto toda su maquinaria (~70 archivos: scripts, workflows completos, ADRs, documentación). El proyecto parecía otro Guardián, la limpieza dependía de un workflow de inicialización y las copias quedaban congeladas: las mejoras del Guardián no llegaban a los proyectos ya creados.

## Decisión

- **Plataforma:** `jjhoncv/guardian` publica workflows reutilizables (`guardian-*.yml`, `on: workflow_call`). Cada uno baja sus scripts y `tools/netlify` de **su propia versión** (`job.workflow_sha`). El Guardián se usa a sí mismo con llamadores delgados.
- **Esqueleto:** `jjhoncv/guardian-skeleton` tiene solo lo de un proyecto: app mínima, escenario base, alcance/CLAUDE/README en blanco, configuración, la skill `/planificar` y 5 workflows de ~15 líneas que llaman al Guardián `@vX.Y.Z`. Su propio check «validar esqueleto» lo instancia y corre todo.
- **Creación:** `scripts/nuevo-proyecto.sh <nombre>` (lo corre el dueño): Paso 0 revisa y dice qué falta; pide el token de Netlify y crea el sitio; crea el repo; guarda los secretos; pide y valida un PAT por proyecto; recién entonces sube el esqueleto, configura protecciones y verifica staging. Reanudable.
- Se retiran: el workflow «Inicializar proyecto», `scripts/inicializar-proyecto.sh` y `docs/*.ejemplo.md` (sus textos viven en el esqueleto). El Guardián deja de ser *template*.

## Por qué

El proyecto ve solo lo suyo; ningún workflow corre sin llaves; las mejoras llegan subiendo la versión (Dependabot lo propone). Se descartó separar en dos repos con copias completas: la maquinaria vive en un solo lugar.
