# 0011. PAT fine-grained para release-please

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

Los PRs creados con `GITHUB_TOKEN` no disparan el CI, así que el PR de release no tendría pipeline.

## Decisión

release-please usa un PAT fine-grained limitado a este repo (Contents y Pull requests en lectura y escritura), con vencimiento de 90 días, guardado como GitHub Secret.

## Por qué

Es lo más simple con permisos mínimos. Una GitHub App propia está en el Parking lot. Hay que renovarlo cada 90 días.
