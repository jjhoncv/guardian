# 0008. Un solo sitio de Netlify con deploys desde Actions

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

Hacen falta preview por PR, staging y producción con aprobación.

## Decisión

Un solo sitio de Netlify. Todos los deploys salen de GitHub Actions con Netlify CLI: `--alias pr-N` (preview), `--alias staging` (cada merge a `main`) y `--prod` (release aprobado). Los builds automáticos de Netlify quedan apagados.

## Por qué

Producción depende solo del GitHub Environment con aprobación; Netlify no publica nada por su cuenta. Un sitio = un token y un ID.
