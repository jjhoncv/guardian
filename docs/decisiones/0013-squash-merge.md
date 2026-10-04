# 0013. Solo squash merge

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

Con merge commits, release-please lee cada cambio dos veces (el commit y el merge commit) y el CHANGELOG sale duplicado.

## Decisión

El repo solo permite **squash merge**: cada PR entra a `main` como un commit cuyo mensaje es el título del PR (Conventional Commits con ticket, p. ej. `feat(#12): ...`). Las ramas se borran al hacer merge. Se aplica con `scripts/configurar-repo.sh`.

## Por qué

Un PR = un cambio lógico = un commit = una línea del CHANGELOG. El título del PR pasa a ser lo que importa.
